require('dotenv').config();
const express = require("express");
const router = express.Router();
const twilio = require("twilio");

// 🧠 Import your team's MongoDB Models
const Equipment = require("../models/equipment");
const Order = require("../models/Order");
const Customer = require("../models/Customer");
const { assertFitsInAisle } = require("../utils/aisleCapacity");

// 📧 Import Email Service
const {
  sendCustomerRegistrationEmail,
  sendOrderConfirmationEmail,
} = require("../services/emailService");

/** Legacy inventory JSON shape expected by older UIs */
function toInventoryRow(doc) {
  const o = doc.toObject ? doc.toObject() : { ...doc };
  return {
    ...o,
    itemName: o.name,
    availableQty: o.quantity,
    reservedQty: o.reservedQty ?? 0,
  };
}

// 📱 TWILIO SMS SETUP
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

let twilioClient = null;
if (accountSid && accountSid.startsWith("AC") && authToken) {
  try {
    twilioClient = new twilio(accountSid, authToken);
    console.log("✅ Twilio SMS configured successfully");
  } catch (err) {
    console.warn("⚠️  Twilio initialization failed:", err.message);
  }
} else {
  console.warn("⚠️  Twilio credentials not configured (SMS disabled)");
}

let systemSettings = {
  operationsEmail: "buildforge.operations@gmail.com",
  operationsPhone: "+94770000000",
};

// ========== 📦 INVENTORY ROUTES ==========
router.get("/inventory", async (req, res) => {
  try {
    const list = await Equipment.find({ status: "Available" }).sort({ name: 1 });
    const enriched = list.map((doc) => {
      const inventoryRow = toInventoryRow(doc);
      inventoryRow.trueAvailableQty = Math.max(0, doc.quantity - (doc.reservedQty || 0) - (doc.damagedQuantity || 0));
      return inventoryRow;
    });
    res.json(enriched);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post("/inventory", async (req, res) => {
  try {
    const { itemName, availableQty, location } = req.body;
    const name = itemName !== undefined ? String(itemName).trim() : "";
    const qty = Number(availableQty);
    const loc = location !== undefined ? String(location).trim() : "";

    if (!name) return res.status(400).json({ error: "itemName is required" });
    if (Number.isNaN(qty) || qty < 0) return res.status(400).json({ error: "availableQty must be a non-negative number" });

    const fit = await assertFitsInAisle(loc, qty, null);
    if (!fit.ok) return res.status(400).json({ error: fit.message });

    const newEquipment = await Equipment.create({ name, quantity: qty, reservedQty: 0, location: loc });
    res.json({ message: "Equipment added successfully!", equipment: toInventoryRow(newEquipment) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ========== 👥 CUSTOMER ROUTES ==========
router.get("/customers", async (req, res) => {
  try {
    const customers = await Customer.find().sort({ createdAt: -1 });
    res.json(customers);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post("/customers", async (req, res) => {
  try {
    const { fullName, shopName, contactNumber, address, email, status } = req.body;
    if (!fullName || !fullName.trim()) return res.status(400).json({ error: "Full Name is required" });
    if (!shopName || !shopName.trim()) return res.status(400).json({ error: "Shop Name is required" });
    if (!contactNumber || !contactNumber.trim()) return res.status(400).json({ error: "Contact Number is required" });
    if (!address || !address.trim()) return res.status(400).json({ error: "Address is required" });

    const customer = new Customer({
      fullName: fullName.trim(),
      shopName: shopName.trim(),
      contactNumber: contactNumber.trim(),
      email: email ? email.trim() : undefined,
      address: address.trim(),
      status: status && ["Pending", "Active", "Inactive"].includes(status) ? status : "Active",
    });
    await customer.save();

    if (email && email.trim()) {
      sendCustomerRegistrationEmail(email.trim(), fullName.trim(), shopName.trim()).catch((err) => console.warn("⚠️ Customer registration email failed:", err.message));
    }
    res.status(201).json({ message: "Customer created successfully!", customer });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put("/customers/:id", async (req, res) => {
  try {
    const { fullName, shopName, contactNumber, address, email, status } = req.body;
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ error: "Customer not found" });

    customer.fullName = fullName ? fullName.trim() : customer.fullName;
    customer.shopName = shopName ? shopName.trim() : customer.shopName;
    customer.contactNumber = contactNumber ? contactNumber.trim() : customer.contactNumber;
    customer.email = email ? email.trim() : customer.email;
    customer.address = address ? address.trim() : customer.address;
    if (status && ["Pending", "Active", "Inactive"].includes(status)) customer.status = status;

    await customer.save();
    res.json({ message: "Customer updated", customer });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete("/customers/:id", async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ error: "Customer not found" });
    await customer.deleteOne();
    res.json({ message: "Customer deleted" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ========== 📜 ORDER ROUTES ==========
router.get("/orders", async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post("/orders", async (req, res) => {
  try {
    const selectedCustomerName = req.body.customerName;
    const selectedCustomerId = req.body.customerId || null;

    let priority = req.body.priority || "MEDIUM";
    const priorityMap = { high: "HIGH", HIGH: "HIGH", medium: "MEDIUM", MEDIUM: "MEDIUM", normal: "MEDIUM", NORMAL: "MEDIUM", low: "LOW", LOW: "LOW" };
    priority = priorityMap[priority] || "MEDIUM";

    let itemsRequested = [];
    if (req.body.itemsRequested && Array.isArray(req.body.itemsRequested)) {
      itemsRequested = req.body.itemsRequested.map((item) => ({ itemName: item.itemName, qty: Number(item.qty), pickedQty: 0 }));
    } else if (req.body.equipmentName) {
      itemsRequested = [{ itemName: req.body.equipmentName, qty: Number(req.body.qty), pickedQty: 0 }];
    }

    if (itemsRequested.length === 0) return res.status(400).json({ error: "At least one item is required in the order" });

    for (let item of itemsRequested) {
      const equipment = await Equipment.findOne({ name: item.itemName });
      if (!equipment) return res.status(400).json({ error: `Equipment "${item.itemName}" not found` });
    }

    const newOrder = new Order({ customerId: selectedCustomerId, customerName: selectedCustomerName, priority: priority, status: "Pending", itemsRequested: itemsRequested });
    await newOrder.save();

    if (selectedCustomerId) {
      try {
        const customer = await Customer.findById(selectedCustomerId);
        if (customer && customer.email) {
          sendOrderConfirmationEmail(customer.email, selectedCustomerName, newOrder._id.toString().slice(-6).toUpperCase(), priority, newOrder.itemsRequested).catch(() => {});
        }
      } catch (emailErr) { console.warn("⚠️ Could not send order confirmation email:", emailErr.message); }
    }
    res.json({ message: "Order created successfully!", order: newOrder });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put("/orders/:id/cancel", async (req, res) => {
  try {
    const { cancellationCategory, cancellationReason } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });

    order.status = "Cancelled";
    order.cancellationCategory = cancellationCategory;
    order.cancellationReason = cancellationReason;
    order.cancelledAt = new Date();

    await order.save();
    res.json({ message: "Order moved to Cancellation Audit Trail!", order });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put("/orders/:id/approve", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });

    order.status = "Approved";

    for (let requestedItem of order.itemsRequested) {
      const inventoryItem = await Equipment.findOne({ name: requestedItem.itemName });
      if (inventoryItem) {
        const free = inventoryItem.quantity - inventoryItem.reservedQty;
        if (requestedItem.qty > free) return res.status(400).json({ error: `Insufficient stock for "${requestedItem.itemName}"` });
        inventoryItem.reservedQty += requestedItem.qty;
        await inventoryItem.save();
      }
      order.stockMovements.push({ action: "Reserved", itemName: requestedItem.itemName, qty: requestedItem.qty, notes: "Order approved and stock reserved" });
    }
    await order.save();
    res.json({ message: "Order Approved Successfully!", order });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ========== 👷‍♂️ PICKING & GATE PASS ==========
router.post("/orders/:id/generate-picklist", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });
    order.status = "Picking";
    order.pickingStartedAt = new Date();
    await order.save();
    res.json({ message: "Pick List generated successfully!", order });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put("/orders/:id/confirm-pick", async (req, res) => {
  try {
    const { itemName, pickedQty, warehouseStaff } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });

    const item = order.itemsRequested.find((i) => i.itemName === itemName);
    if (item) item.pickedQty += pickedQty;

    order.stockMovements.push({ itemName, qty: pickedQty, action: "Picked", notes: `Picked by ${warehouseStaff}` });

    const allPicked = order.itemsRequested.every((i) => i.pickedQty >= i.qty);
    if (allPicked) {
      order.status = "Ready for Gate Pass";
      order.pickingCompletedAt = new Date();
      order.pickedBy = warehouseStaff;
    }
    await order.save();
    res.json({ message: "Item picked successfully!", order });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post("/orders/:id/generate-gatepass", async (req, res) => {
  try {
    const { driverName, dispatchLocation, vehicleNumber, vehicleType } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });

    order.gatePassNumber = "GP-" + Math.random().toString(36).substr(2, 9).toUpperCase();
    order.generatedAt = new Date();
    order.driverName = driverName;
    order.dispatchLocation = dispatchLocation;
    order.vehicleNumber = vehicleNumber;
    order.vehicleType = vehicleType;

    await order.save();
    res.json({ message: "Gate Pass generated!", gatePass: order });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put("/orders/:id/dispatch", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });

    order.status = "Dispatched";
    for (let requestedItem of order.itemsRequested) {
      const inventoryItem = await Equipment.findOne({ name: requestedItem.itemName });
      if (inventoryItem) {
        const dispatchQty = requestedItem.pickedQty > 0 ? requestedItem.pickedQty : requestedItem.qty;
        inventoryItem.quantity -= dispatchQty;
        inventoryItem.reservedQty = Math.max(0, inventoryItem.reservedQty - dispatchQty);
        await inventoryItem.save();
      }
      order.stockMovements.push({ itemName: requestedItem.itemName, qty: requestedItem.qty, action: "Dispatched", notes: `Dispatched` });
    }
    await order.save();
    res.json({ message: "Order Dispatched! Inventory updated.", order });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ========== ⚠️ STOCK REPORTS ==========
router.post("/orders/:id/damage-report", async (req, res) => {
  try {
    const { itemName, qty, reason, reportedBy } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });

    const item = order.itemsRequested.find((i) => i.itemName === itemName);
    if (item) item.pickedQty -= qty;

    order.damageReports.push({ itemName, qty, reason, reportedBy });
    order.stockMovements.push({ action: "Damaged", itemName, qty, notes: reason });

    const inventoryItem = await Equipment.findOne({ name: itemName });
    if (inventoryItem) {
      inventoryItem.quantity += qty;
      inventoryItem.reservedQty = Math.max(0, inventoryItem.reservedQty - qty);
      await inventoryItem.save();
    }
    await order.save();
    res.json({ message: "Damage report recorded!", order });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get("/orders/:id/stock-movements", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json({ orderId: order._id, customerName: order.customerName, stockMovements: order.stockMovements, damageReports: order.damageReports });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get("/stock-movements", async (req, res) => {
  try {
    const orders = await Order.find();
    const allMovements = orders.reduce((acc, order) => {
      order.stockMovements.forEach((movement) => {
        acc.push({ orderId: order._id, customerName: order.customerName, ...(movement.toObject ? movement.toObject() : movement) });
      });
      return acc;
    }, []);
    allMovements.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    res.json(allMovements);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ========== 🪄 BACKORDER & DECISION LOOP (MAGIC LINK) ==========
// 1. TRIGGER MAGIC LINK EMAIL TO CUSTOMER (Smart Split Logic)
router.put("/orders/:id/backorder", async (req, res) => {
    try {
        const order = await Order.findById(req.params.id).populate('customerId');
        if (!order) return res.status(404).json({ error: "Order not found" });

        order.status = "Waiting on Customer";
        await order.save();

        const customerEmail = order.customerId?.email;
        if (!customerEmail) {
            order.status = "Backordered";
            await order.save();
            return res.json({ message: "No email found. Sent directly to Backordered." });
        }

        // 🧠 THE UPGRADE: Calculate exactly what is missing!
        const inventory = await Equipment.find({ status: "Available" });
        let availableItemsHtml = "";
        let missingItemsHtml = "";
        let hasAvailableItems = false;

        order.itemsRequested.forEach(reqItem => {
            const invItem = inventory.find(inv => inv.name === reqItem.itemName);
            const availableQty = invItem ? Math.max(0, invItem.quantity - (invItem.reservedQty || 0)) : 0;

            if (availableQty >= reqItem.qty) {
                availableItemsHtml += `<li style="color: #27ae60;">✅ <strong>${reqItem.qty}x ${reqItem.itemName}</strong> (In Stock & Ready)</li>`;
                hasAvailableItems = true;
            } else {
                missingItemsHtml += `<li style="color: #e74c3c;">❌ <strong>${reqItem.qty}x ${reqItem.itemName}</strong> (Out of Stock - 15 Days Mfg. Time)</li>`;
            }
        });

        // The Action Links
        const acceptAllLink = `http://localhost:5001/api/manager/orders/${order._id}/decision?choice=acceptAll`;
        const splitLink = `http://localhost:5001/api/manager/orders/${order._id}/decision?choice=split`;
        const dropMissingLink = `http://localhost:5001/api/manager/orders/${order._id}/decision?choice=dropMissing`;
        const cancelLink = `http://localhost:5001/api/manager/orders/${order._id}/decision?choice=cancel`;

        // Dynamic Buttons based on stock
        let buttonsHtml = "";
        if (hasAvailableItems) {
            buttonsHtml = `
                <p><strong>Option 1: Split Order</strong> <br><span style="font-size: 0.9em; color: #555;">(Send available items immediately, manufacture the rest and send later)</span><br>
                <a href="${splitLink}" style="padding: 8px 15px; display: inline-block; margin-top: 5px; background: #3498db; color: white; text-decoration: none; border-radius: 4px;">✂️ Split My Order</a></p>

                <p><strong>Option 2: Drop Missing Items</strong> <br><span style="font-size: 0.9em; color: #555;">(Send available items immediately, permanently cancel the out-of-stock items)</span><br>
                <a href="${dropMissingLink}" style="padding: 8px 15px; display: inline-block; margin-top: 5px; background: #f39c12; color: white; text-decoration: none; border-radius: 4px;">🗑️ Drop Missing Items</a></p>
                
                <p><strong>Option 3: Wait for Everything</strong> <br><span style="font-size: 0.9em; color: #555;">(Hold the stock, manufacture missing items, send everything together)</span><br>
                <a href="${acceptAllLink}" style="padding: 8px 15px; display: inline-block; margin-top: 5px; background: #27ae60; color: white; text-decoration: none; border-radius: 4px;">⏳ Wait for All</a></p>

                <p><strong>Option 4: Cancel Entire Order</strong><br>
                <a href="${cancelLink}" style="padding: 8px 15px; display: inline-block; margin-top: 5px; background: #e74c3c; color: white; text-decoration: none; border-radius: 4px;">❌ Cancel Order</a></p>
            `;
        } else {
            buttonsHtml = `
                <p><strong>Option 1: Wait for Manufacturing</strong><br>
                <a href="${acceptAllLink}" style="padding: 8px 15px; display: inline-block; margin-top: 5px; background: #27ae60; color: white; text-decoration: none; border-radius: 4px;">⏳ I Will Wait</a></p>

                <p><strong>Option 2: Cancel Order</strong><br>
                <a href="${cancelLink}" style="padding: 8px 15px; display: inline-block; margin-top: 5px; background: #e74c3c; color: white; text-decoration: none; border-radius: 4px;">❌ Cancel Order</a></p>
            `;
        }

        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
        });

        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: customerEmail,
            subject: `BuildForge: Action Required for Order #${order._id.toString().slice(-6).toUpperCase()}`,
            html: `
                <div style="font-family: Arial; padding: 20px; border: 1px solid #eee; border-radius: 8px; max-width: 600px;">
                    <h2 style="color: #2c3e50;">Hello ${order.customerName},</h2>
                    <p style="color: #34495e;">We are preparing your order. Here is your current stock status:</p>
                    <ul style="list-style-type: none; padding-left: 0;">
                        ${availableItemsHtml}
                        ${missingItemsHtml}
                    </ul>
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="color: #34495e; font-weight: bold;">How would you like us to proceed?</p>
                    ${buttonsHtml}
                </div>
            `
        });
        res.json({ message: "Smart decision email sent to customer!" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});
// 2. MAGIC LINK LISTENER (Smart Order Splitter)
router.get('/orders/:id/decision', async (req, res) => {
    try {
        const { choice } = req.query; 
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.send("<h1 style='font-family: Arial; text-align: center; margin-top: 50px;'>Order not found or already processed.</h1>");
        }

        // --- OPTION 1 & 2: Simple Wait or Cancel ---
        if (choice === 'acceptAll') {
            order.status = 'Customer Accepted Delay';
            await order.save();
            return res.send(`<div style='text-align: center; margin-top: 50px; color: #27ae60; font-family: Arial;'><h1>✅ Thank you!</h1><h2>We will manufacture all items and send them together.</h2></div>`);
        } 
        else if (choice === 'cancel') {
            order.status = 'Customer Cancelled';
            await order.save();
            return res.send(`<div style='text-align: center; margin-top: 50px; color: #e74c3c; font-family: Arial;'><h1>❌ Cancellation Requested</h1><h2>Your request has been forwarded to our Sales Manager.</h2></div>`);
        }

        // --- THE MAGIC: RECALCULATE INVENTORY FOR SPLIT/DROP ---
        const inventory = await Equipment.find({ status: "Available" });
        let availableItems = [];
        let missingItems = [];

        order.itemsRequested.forEach(reqItem => {
            const invItem = inventory.find(inv => inv.name === reqItem.itemName);
            const availableQty = invItem ? Math.max(0, invItem.quantity - (invItem.reservedQty || 0)) : 0;

            if (availableQty >= reqItem.qty) {
                availableItems.push(reqItem);
            } else {
                missingItems.push(reqItem);
            }
        });

        // --- OPTION 3: Drop Missing Items ---
        if (choice === 'dropMissing') {
            order.itemsRequested = availableItems; 
            order.status = 'Pending'; // Send back to pending for immediate approval
            order.customerName = `${order.customerName} (Dropped Missing Items)`;
            await order.save();
            return res.send(`<div style='text-align: center; margin-top: 50px; color: #f39c12; font-family: Arial;'><h1>✅ Order Updated!</h1><h2>We have removed the out-of-stock items. The rest will be dispatched shortly.</h2></div>`);
        }

        // --- OPTION 4: The Enterprise "Split Order" ---
        if (choice === 'split') {
            // Create Child Order A (The Available Items)
            const orderA = new Order({
                customerId: order.customerId,
                customerName: `${order.customerName} (Part 1 - Ready)`,
                priority: order.priority,
                itemsRequested: availableItems,
                status: 'Pending' // Goes to Manager to easily click "Approve"
            });

            // Create Child Order B (The Missing Items)
            const orderB = new Order({
                customerId: order.customerId,
                customerName: `${order.customerName} (Part 2 - Backordered)`,
                priority: order.priority,
                itemsRequested: missingItems,
                status: 'Backordered' // Skips the manager, goes straight to Factory Queue!
            });

            await orderA.save();
            await orderB.save();

            // Archive the original parent order so it disappears from the main queue
            order.status = 'Cancelled';
            order.cancellationCategory = 'System Auto-Split';
            order.cancellationReason = 'Order was split into Part 1 (Available) and Part 2 (Backordered) by customer.';
            order.cancelledAt = new Date();
            await order.save();

            return res.send(`<div style='text-align: center; margin-top: 50px; color: #3498db; font-family: Arial;'><h1>✂️ Order Successfully Split!</h1><h2>We are preparing your available items now. The rest have been sent to the factory!</h2></div>`);
        }

    } catch (err) { 
        console.error(err);
        res.status(500).send("<h1 style='text-align: center; color: red;'>Error processing request.</h1>"); 
    }
});

router.put("/orders/:id/confirm-factory", async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ error: "Order not found" });

        order.status = "Backordered"; 
        await order.save();

        let equipmentList = order.itemsRequested.map(item => `- ${item.qty}x ${item.itemName}`).join("\n");
        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
        });

        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: systemSettings.operationsEmail,
            subject: `⚠️ URGENT: Manufacturing Request for ${order.customerName}`,
            text: `Operations Team,\n\nCustomer accepted delay for:\n${equipmentList}\n\nPlease begin production.`
        });

        if (twilioClient && process.env.TWILIO_ACCOUNT_SID) {
            await twilioClient.messages.create({
                body: `BuildForge Alert: Urgent stock shortage for ${order.customerName}. Email sent.`,
                from: twilioPhoneNumber,
                to: systemSettings.operationsPhone,
            });
        }
        res.json({ message: "Sent to factory! Email delivered." });
    } catch (error) {
        console.log("⚠️ Note: Email failed, but database was updated.");
        res.json({ message: "Sent to factory! (Email offline)" });
    }
});

// ========== ⚙️ SETTINGS ==========
router.get("/settings", (req, res) => res.json(systemSettings));
router.put("/settings", (req, res) => {
  systemSettings.operationsEmail = req.body.operationsEmail;
  systemSettings.operationsPhone = req.body.operationsPhone;
  res.json({ message: "Settings saved!", settings: systemSettings });
});

// ==========================================
// 📊 BI DASHBOARD: STATISTICS & LEADERBOARDS
// ==========================================
router.get("/reports/dashboard-stats", async (req, res) => {
    try {
        // 1. Basic KPIs (Key Performance Indicators)
        // Count all orders in the database
        const totalOrders = await Order.countDocuments();
        
        // Count only the orders waiting for the manager
        const pendingApprovals = await Order.countDocuments({ status: 'Pending' });

        // 2. Fetch completed orders to calculate the real winners
        const completedOrders = await Order.find({ 
            status: { $in: ['Dispatched', 'Completed'] } 
        });

        let clientStats = {};
        let itemStats = {};

        // 3. Loop through orders and tally up the numbers
        completedOrders.forEach(order => {
            // Tally Top Clients
            if (!clientStats[order.customerName]) {
                clientStats[order.customerName] = 0;
            }
            clientStats[order.customerName] += 1;

            // Tally Top Items
            order.itemsRequested.forEach(item => {
                if (!itemStats[item.itemName]) {
                    itemStats[item.itemName] = 0;
                }
                itemStats[item.itemName] += item.qty;
            });
        });

        // 4. Find the absolute #1 Client for the top cards
        let topClientName = "No Data Yet";
        let maxOrders = 0;
        for (const [name, count] of Object.entries(clientStats)) {
            if (count > maxOrders) { 
                topClientName = name; 
                maxOrders = count; 
            }
        }

        // Find the absolute #1 Item for the top cards
        let topItemName = "No Data Yet";
        let maxQty = 0;
        for (const [name, qty] of Object.entries(itemStats)) {
            if (qty > maxQty) { 
                topItemName = name; 
                maxQty = qty; 
            }
        }

        // 5. Sort the lists for the Leaderboard Tables (Top 5 only)
        const topClientsList = Object.entries(clientStats)
            .map(([name, orders]) => ({ name, orders }))
            .sort((a, b) => b.orders - a.orders)
            .slice(0, 5);

        const topItemsList = Object.entries(itemStats)
            .map(([name, qty]) => ({ name, qty }))
            .sort((a, b) => b.qty - a.qty)
            .slice(0, 5);

        // 6. Send all this beautiful data to React
        res.json({
            kpis: {
                totalOrders,
                pendingApprovals,
                topClient: topClientName,
                topItem: topItemName
            },
            leaderboards: {
                clients: topClientsList,
                items: topItemsList
            }
        });
    } catch (err) {
        console.error("Dashboard Stats Error:", err);
        res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }

    
});

// ==========================================
// 🤖 AI DEMAND FORECASTING (GEMINI AI)
// ==========================================
const { GoogleGenerativeAI } = require("@google/generative-ai");

router.get("/reports/forecast/ai", async (req, res) => {
    try {
        // 1. Verify the API Key exists
        if (!process.env.GEMINI_API_KEY) {
            console.error("Missing GEMINI_API_KEY in .env file");
            return res.status(500).json({ error: "AI Key missing" });
        }

        // 2. Initialize Google Gemini AI
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        // 3. Fetch completed orders to see what has been selling
        const completedOrders = await Order.find({ 
            status: { $in: ['Dispatched', 'Completed'] } 
        });

        // 4. Tally up the sales data to send to the AI
        let itemStats = {};
        completedOrders.forEach(order => {
            order.itemsRequested.forEach(item => {
                if (!itemStats[item.itemName]) itemStats[item.itemName] = 0;
                itemStats[item.itemName] += item.qty;
            });
        });

        // 5. If there is no data, send an empty array back to React
        if (Object.keys(itemStats).length === 0) {
            return res.json([]);
        }

        // 6. Write the Prompt for the AI
        const prompt = `
        You are an expert Business Intelligence AI for a warehouse.
        Here is the exact sales data for our equipment over the past 30 days:
        ${JSON.stringify(itemStats)}

        Based on this past sales data, predict the demand for each item for the NEXT 30 days.
        You MUST respond ONLY with a valid JSON array. Do NOT include markdown formatting like \`\`\`json.
        The JSON format must look exactly like this:
        [
          { "name": "Scaffolding Set", "pastSales": 17, "predictedDemand": 25 },
          { "name": "Wheelbarrow", "pastSales": 2, "predictedDemand": 5 }
        ]
        `;

        // 7. Ask Gemini for the prediction!
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        
        // 8. Clean up the response in case the AI adds extra text
        const cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        // 9. Send the AI prediction to your beautiful Recharts graph!
        const forecastData = JSON.parse(cleanedText);
        res.json(forecastData);

    } catch (err) {
        console.error("AI Forecast Error:", err);
        res.status(500).json({ error: "Failed to generate AI forecast" });
    }
});

module.exports = router;