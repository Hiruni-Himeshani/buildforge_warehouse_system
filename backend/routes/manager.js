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
            return res.json({ message: "No email found. Order sent directly to Backordered status." });
        }

        const acceptLink = `http://localhost:5001/api/manager/orders/${order._id}/decision?choice=accept`;
        const cancelLink = `http://localhost:5001/api/manager/orders/${order._id}/decision?choice=cancel`;

        const mailOptions = {
            to: customerEmail,
            subject: 'BuildForge: Important Update Regarding Your Order',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #2c3e50;">
                    <h2 style="color: #f39c12;">Hello ${order.customerName},</h2>
                    <p>Unfortunately, we do not have enough stock in our warehouse to fulfill your equipment order immediately.</p>
                    <p>It will take approximately <strong>15 extra days</strong> for our factory to manufacture the items.</p>
                    <p>Please click one of the buttons below to tell us how you would like to proceed:</p>
                    <br><br>
                    <a href="${acceptLink}" style="padding: 12px 25px; background-color: #27ae60; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">✅ I Will Wait</a>
                    &nbsp;&nbsp;&nbsp;&nbsp;
                    <a href="${cancelLink}" style="padding: 12px 25px; background-color: #e74c3c; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">❌ Cancel Order</a>
                </div>
            `
        };

        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
        });

        await transporter.sendMail({ from: process.env.EMAIL_USER, ...mailOptions });
        res.json({ message: "Decision email sent to customer!" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/orders/:id/decision', async (req, res) => {
    try {
        const { choice } = req.query; 
        const order = await Order.findById(req.params.id);

        if (!order) return res.send("<h1 style='text-align: center; margin-top: 50px;'>Order not found.</h1>");

        if (choice === 'accept') {
            order.status = 'Customer Accepted Delay';
            await order.save();
            return res.send(`<div style='text-align: center; margin-top: 50px; color: #27ae60; font-family: Arial;'><h1>✅ Thank you!</h1><h2>We will notify the factory to begin production immediately.</h2></div>`);
        } else if (choice === 'cancel') {
            order.status = 'Customer Cancelled';
            await order.save();
            return res.send(`<div style='text-align: center; margin-top: 50px; color: #e74c3c; font-family: Arial;'><h1>❌ Cancellation Requested</h1><h2>Your request has been forwarded to our Sales Manager.</h2></div>`);
        }
    } catch (err) { res.status(500).send("Error processing request."); }
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

module.exports = router;