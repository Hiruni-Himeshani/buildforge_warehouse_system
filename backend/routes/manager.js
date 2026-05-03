const express = require("express");
const router = express.Router();
const twilio = require("twilio");

// 🧠 Import your team's new MongoDB Models!
const Equipment = require("../models/equipment");
const Order = require("../models/Order");
const Customer = require("../models/Customer");
const { assertFitsInAisle } = require("../utils/aisleCapacity");

// 📧 Import Email Service
const {
  sendCustomerRegistrationEmail,
  sendOrderConfirmationEmail,
} = require("../services/emailService");

/** Legacy inventory JSON shape expected by older UIs (itemName, availableQty, reservedQty). */
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

// ✅ Only initialize Twilio if valid credentials are provided
let twilioClient = null;
if (accountSid && accountSid.startsWith("AC") && authToken) {
  try {
    twilioClient = new twilio(accountSid, authToken);
    console.log("✅ Twilio SMS configured successfully");
  } catch (err) {
    console.warn("⚠️  Twilio initialization failed:", err.message);
  }
} else {
  console.warn(
    "⚠️  Twilio credentials not configured in .env (SMS features disabled)",
  );
}

// We keep settings in memory for now so your emails/SMS still work perfectly!
let systemSettings = {
  operationsEmail: "buildforge.operations@gmail.com",
  operationsPhone: "+94770000000",
};

// ========== 📦 INVENTORY ROUTES (Cloud Connected) ==========
router.get("/inventory", async (req, res) => {
  try {
    // Filter to show only Available (non-damaged) equipment for Sales Officer
    const list = await Equipment.find({ status: "Available" }).sort({
      name: 1,
    });

    // Enrich with calculated available quantity
    const enriched = list.map((doc) => {
      const inventoryRow = toInventoryRow(doc);
      // Calculate true available qty = total - reserved - damaged
      inventoryRow.trueAvailableQty = Math.max(
        0,
        doc.quantity - (doc.reservedQty || 0) - (doc.damagedQuantity || 0),
      );
      return inventoryRow;
    });

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/inventory", async (req, res) => {
  try {
    const { itemName, availableQty, location } = req.body;
    const name = itemName !== undefined ? String(itemName).trim() : "";
    const qty = Number(availableQty);
    const loc = location !== undefined ? String(location).trim() : "";

    if (!name) {
      return res.status(400).json({ error: "itemName is required" });
    }
    if (Number.isNaN(qty) || qty < 0) {
      return res
        .status(400)
        .json({ error: "availableQty must be a non-negative number" });
    }

    const fit = await assertFitsInAisle(loc, qty, null);
    if (!fit.ok) {
      return res.status(400).json({ error: fit.message });
    }

    const newEquipment = await Equipment.create({
      name,
      quantity: qty,
      reservedQty: 0,
      location: loc,
    });
    res.json({
      message: "Equipment added successfully!",
      equipment: toInventoryRow(newEquipment),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== � CUSTOMER ROUTES (Sales Officer) ==========
router.get("/customers", async (req, res) => {
  try {
    console.log("[manager] GET /customers called");
    const customers = await Customer.find().sort({ createdAt: -1 });
    console.log(
      `[manager] GET /customers returned ${customers.length} records`,
    );
    res.json(customers);
  } catch (err) {
    console.error("[manager] GET /customers failed:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/manager/customers
 * Create new customer and send registration confirmation email
 */
router.post("/customers", async (req, res) => {
  try {
    console.log("[manager] POST /customers called with payload:", req.body);
    const { fullName, contactNumber, province, district, deliveryLocation, email, status } =
      req.body;
    if (!fullName || !fullName.trim())
      return res.status(400).json({ error: "Full Name is required" });
    if (!contactNumber || !contactNumber.trim())
      return res.status(400).json({ error: "Contact Number is required" });
    if (!province || !province.trim())
      return res.status(400).json({ error: "Province is required" });
    if (!district || !district.trim())
      return res.status(400).json({ error: "District is required" });
    if (!deliveryLocation || !deliveryLocation.trim())
      return res.status(400).json({ error: "Delivery Location is required" });

    const customer = new Customer({
      fullName: fullName.trim(),
      contactNumber: contactNumber.trim(),
      province: province.trim(),
      district: district.trim(),
      deliveryLocation: deliveryLocation.trim(),
      email: email ? email.trim() : undefined,
      status:
        status && ["Pending", "Active", "Inactive"].includes(status)
          ? status
          : "Active",
    });
    await customer.save();
    console.log("[manager] POST /customers succeeded:", customer._id);

    // 📧 Send customer registration confirmation email
    if (email && email.trim()) {
      sendCustomerRegistrationEmail(
        email.trim(),
        fullName.trim(),
      ).catch((err) =>
        console.warn("⚠️ Customer registration email failed:", err.message),
      );
    }

    res
      .status(201)
      .json({ message: "Customer created successfully!", customer });
  } catch (err) {
    console.error("[manager] POST /customers failed:", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.put("/customers/:id", async (req, res) => {
  try {
    console.log(
      "[manager] PUT /customers/" + req.params.id + " called with payload:",
      req.body,
    );
    const { fullName, contactNumber, province, district, deliveryLocation, email, status } =
      req.body;
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ error: "Customer not found" });

    customer.fullName = fullName ? fullName.trim() : customer.fullName;
    customer.contactNumber = contactNumber
      ? contactNumber.trim()
      : customer.contactNumber;
    customer.province = province ? province.trim() : customer.province;
    customer.district = district ? district.trim() : customer.district;
    customer.deliveryLocation = deliveryLocation ? deliveryLocation.trim() : customer.deliveryLocation;
    customer.email = email ? email.trim() : customer.email;
    if (status && ["Pending", "Active", "Inactive"].includes(status))
      customer.status = status;

    await customer.save();
    console.log("[manager] PUT /customers/" + req.params.id + " succeeded");
    res.json({ message: "Customer updated", customer });
  } catch (err) {
    console.error(
      "[manager] PUT /customers/" + req.params.id + " failed:",
      err.message,
    );
    res.status(500).json({ error: err.message });
  }
});

router.delete("/customers/:id", async (req, res) => {
  try {
    console.log("[manager] DELETE /customers/" + req.params.id + " called");
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ error: "Customer not found" });

    await customer.deleteOne();
    console.log("[manager] DELETE /customers/" + req.params.id + " succeeded");
    res.json({ message: "Customer deleted" });
  } catch (err) {
    console.error(
      "[manager] DELETE /customers/" + req.params.id + " failed:",
      err.message,
    );
    res.status(500).json({ error: err.message });
  }
});

// ========== �📜 ORDER ROUTES (Cloud Connected) ==========
router.get("/orders", async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 }); // Newest first
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/orders", async (req, res) => {
  try {
    console.log("[manager] POST /orders called with payload:", req.body);
    const selectedCustomerName = req.body.customerName;
    const selectedCustomerId = req.body.customerId || null;

    // Normalize priority: accept various formats and convert to standard enum
    let priority = req.body.priority || "MEDIUM";
    const priorityMap = {
      high: "HIGH",
      HIGH: "HIGH",
      medium: "MEDIUM",
      MEDIUM: "MEDIUM",
      normal: "MEDIUM",
      NORMAL: "MEDIUM",
      low: "LOW",
      LOW: "LOW",
    };
    priority = priorityMap[priority] || "MEDIUM";

    // Handle both single item (legacy) and multiple items (new)
    let itemsRequested = [];

    if (req.body.itemsRequested && Array.isArray(req.body.itemsRequested)) {
      // New multi-item format from frontend
      itemsRequested = req.body.itemsRequested.map((item) => ({
        itemName: item.itemName,
        qty: Number(item.qty),
        pickedQty: 0,
      }));
    } else if (req.body.equipmentName) {
      // Legacy single-item format
      itemsRequested = [
        {
          itemName: req.body.equipmentName,
          qty: Number(req.body.qty),
          pickedQty: 0,
        },
      ];
    }

    if (itemsRequested.length === 0) {
      return res
        .status(400)
        .json({ error: "At least one item is required in the order" });
    }

    // Verify all equipment exists in the system
    for (let item of itemsRequested) {
      const equipment = await Equipment.findOne({ name: item.itemName });
      if (!equipment) {
        return res
          .status(400)
          .json({ error: `Equipment "${item.itemName}" not found` });
      }
    }

    const newOrder = new Order({
      customerId: selectedCustomerId,
      customerName: selectedCustomerName,
      priority: priority,
      status: "Pending",
      itemsRequested: itemsRequested,
    });
    await newOrder.save();
    console.log("[manager] POST /orders succeeded:", newOrder._id);

    // 📧 Send order confirmation email to customer
    if (selectedCustomerId) {
      try {
        const customer = await Customer.findById(selectedCustomerId);
        if (customer && customer.email) {
          // Send order confirmation to customer email
          sendOrderConfirmationEmail(
            customer.email,
            selectedCustomerName,
            newOrder._id.toString().slice(-6).toUpperCase(),
            priority,
            newOrder.itemsRequested,
          ).catch((err) =>
            console.warn("⚠️ Order email notification failed:", err.message),
          );
        } else if (customer) {
          // Send to operations email if customer email not available
          console.log(
            "⚠️ Customer email not available, notifying operations instead",
          );
          sendOrderConfirmationEmail(
            process.env.EMAIL_USER,
            selectedCustomerName,
            newOrder._id.toString().slice(-6).toUpperCase(),
            priority,
            newOrder.itemsRequested,
          ).catch((err) =>
            console.warn("⚠️ Order notification failed:", err.message),
          );
        }
      } catch (emailErr) {
        console.warn(
          "⚠️ Could not send order confirmation email:",
          emailErr.message,
        );
      }
    }

    res.json({ message: "Order created successfully!", order: newOrder });
  } catch (err) {
    console.error("[manager] POST /orders failed:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ========== 🛑 CANCELLATION AUDIT TRAIL ==========
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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== ✅ APPROVAL ROUTE ==========
router.put("/orders/:id/approve", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });

    order.status = "Approved"; // Matches your exact Schema Enum!

    // Loop through items to update Inventory in the cloud
    for (let requestedItem of order.itemsRequested) {
      const inventoryItem = await Equipment.findOne({
        name: requestedItem.itemName,
      });

      if (inventoryItem) {
        const free = inventoryItem.quantity - inventoryItem.reservedQty;
        if (requestedItem.qty > free) {
          return res.status(400).json({
            error: `Insufficient stock for "${requestedItem.itemName}": need ${requestedItem.qty}, ${free} available to reserve.`,
          });
        }
        inventoryItem.reservedQty += requestedItem.qty;
        await inventoryItem.save(); // Save the new reserved amount to the cloud
      }

      order.stockMovements.push({
        action: "Reserved",
        itemName: requestedItem.itemName,
        qty: requestedItem.qty,
        notes: "Order approved and stock reserved",
      });
    }

    await order.save(); // Save the updated order to the cloud
    res.json({ message: "Order Approved Successfully!", order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== 👷‍♂️ PICKING WORKFLOW ==========
router.post("/orders/:id/generate-picklist", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });

    order.status = "Picking";
    order.pickingStartedAt = new Date();
    await order.save();

    const pickList = {
      pickListId: "PL-" + Math.random().toString(36).substr(2, 9).toUpperCase(),
      orderId: order._id,
      customerName: order.customerName,
      items: order.itemsRequested.map((item) => ({
        itemName: item.itemName,
        requiredQty: item.qty,
        pickedQty: item.pickedQty || 0,
      })),
      createdAt: new Date(),
    };

    res.json({ message: "Pick List generated successfully!", order, pickList });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/orders/:id/confirm-pick", async (req, res) => {
  try {
    const { itemName, pickedQty, warehouseStaff } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });

    const item = order.itemsRequested.find((i) => i.itemName === itemName);
    if (item) item.pickedQty += pickedQty;

    order.stockMovements.push({
      itemName: itemName,
      qty: pickedQty,
      action: "Picked",
      notes: `Picked by ${warehouseStaff}`,
    });

    // Check if all items are picked
    const allPicked = order.itemsRequested.every((i) => i.pickedQty >= i.qty);
    if (allPicked) {
      order.status = "Ready for Gate Pass";
      order.pickingCompletedAt = new Date();
      order.pickedBy = warehouseStaff;
    }

    await order.save();
    res.json({ message: "Item picked successfully!", order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== 🚚 GATE PASS & DISPATCH ==========
router.post("/orders/:id/generate-gatepass", async (req, res) => {
  try {
    const { driverName, dispatchLocation, vehicleNumber, vehicleType } =
      req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (order.status !== "Ready for Gate Pass") {
      return res
        .status(400)
        .json({
          error: "Order must be ready for gate pass before generating one",
        });
    }

    order.gatePassNumber =
      "GP-" + Math.random().toString(36).substr(2, 9).toUpperCase();
    order.generatedAt = new Date();
    order.driverName = driverName;
    order.dispatchLocation = dispatchLocation;
    order.vehicleNumber = vehicleNumber;
    order.vehicleType = vehicleType;

    await order.save();

    const gatePass = {
      gatePassNumber: order.gatePassNumber,
      orderId: order._id,
      customerName: order.customerName,
      pickedBy: order.pickedBy,
      driverName: order.driverName,
      dispatchLocation: order.dispatchLocation,
      vehicleNumber: order.vehicleNumber,
      vehicleType: order.vehicleType,
      generatedAt: order.generatedAt,
      items: order.itemsRequested.map((item) => ({
        itemName: item.itemName,
        qty: item.pickedQty || item.qty,
      })),
    };

    res.json({ message: "Gate Pass generated!", gatePass });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/orders/:id/dispatch", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (order.status !== "Ready for Gate Pass") {
      return res
        .status(400)
        .json({
          error: "Order must be Ready for Gate Pass before dispatching",
        });
    }

    order.status = "Dispatched";

    for (let requestedItem of order.itemsRequested) {
      const inventoryItem = await Equipment.findOne({
        name: requestedItem.itemName,
      });

      if (inventoryItem) {
        const dispatchQty =
          requestedItem.pickedQty > 0
            ? requestedItem.pickedQty
            : requestedItem.qty;
        if (dispatchQty > inventoryItem.quantity) {
          return res.status(400).json({
            error: `Cannot dispatch ${dispatchQty} of "${requestedItem.itemName}": only ${inventoryItem.quantity} on hand.`,
          });
        }
        inventoryItem.quantity -= dispatchQty;
        inventoryItem.reservedQty = Math.max(
          0,
          inventoryItem.reservedQty - dispatchQty,
        );
        await inventoryItem.save();
      }

      order.stockMovements.push({
        itemName: requestedItem.itemName,
        qty:
          requestedItem.pickedQty > 0
            ? requestedItem.pickedQty
            : requestedItem.qty,
        action: "Dispatched",
        notes: `Dispatched in vehicle ${order.vehicleNumber || "N/A"}`,
      });
    }

    await order.save();
    res.json({ message: "Order Dispatched! Inventory updated.", order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== ⚠️ EMERGENCY & REPORTS ==========
router.post("/orders/:id/damage-report", async (req, res) => {
  try {
    const { itemName, qty, reason, reportedBy } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });

    const item = order.itemsRequested.find((i) => i.itemName === itemName);
    if (!item)
      return res.status(404).json({ error: "Item not found in order" });
    item.pickedQty -= qty;

    order.damageReports.push({ itemName, qty, reason, reportedBy });
    order.stockMovements.push({
      action: "Damaged",
      itemName,
      qty,
      notes: reason,
    });

    const inventoryItem = await Equipment.findOne({ name: itemName });
    if (inventoryItem) {
      inventoryItem.quantity += qty;
      inventoryItem.reservedQty = Math.max(0, inventoryItem.reservedQty - qty);
      await inventoryItem.save();
    }

    await order.save();
    res.json({ message: "Damage report recorded!", order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/orders/:id/stock-movements", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json({
      orderId: order._id,
      customerName: order.customerName,
      stockMovements: order.stockMovements,
      damageReports: order.damageReports,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/stock-movements", async (req, res) => {
  try {
    const orders = await Order.find();
    const allMovements = orders.reduce((acc, order) => {
      order.stockMovements.forEach((movement) => {
        acc.push({
          orderId: order._id,
          customerName: order.customerName,
          ...(movement.toObject ? movement.toObject() : movement),
        });
      });
      return acc;
    }, []);
    allMovements.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    res.json(allMovements);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== ⚠️ EMERGENCY & REPORTS ==========
router.put("/orders/:id/backorder", async (req, res) => {
  try {
    // 1. FIRST: Safely update the database
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });

    order.status = "Backordered"; // Move it to the Backordered table!
    await order.save();

    let equipmentList = order.itemsRequested
      .map((item) => `- ${item.qty}x ${item.itemName}`)
      .join("\n");

    // 2. SECOND: Try to send alerts inside a "Safe Zone"
    try {
      const mailOptions = {
        from: "BuildForge System",
        to: systemSettings.operationsEmail,
        subject: `⚠️ URGENT: Manufacturing Request for ${order.customerName}`,
        text: `Operations Team,\n\nUrgent stock shortage for:\n${equipmentList}\n\nCustomer: ${order.customerName}`,
      };

      await transporter.sendMail(mailOptions);

      // Only try SMS if Twilio is actually set up in your .env
      if (twilioClient && process.env.TWILIO_ACCOUNT_SID) {
        await twilioClient.messages.create({
          body: `🏗️ BuildForge Alert: Urgent stock shortage for ${order.customerName}. Email sent.`,
          from: twilioPhoneNumber,
          to: systemSettings.operationsPhone,
        });
      }

      // If everything works perfectly:
      return res.json({
        message: "Order Backordered! Alerts delivered successfully.",
      });
    } catch (alertError) {
      // 🛡️ If Twilio or Email fails, it comes here INSTEAD of crashing!
      console.log("⚠️ Note: Email/SMS failed, but database was updated.");
      return res.json({
        message: "Order Backordered! (Email/SMS alerts currently offline)",
        order,
      });
    }
  } catch (error) {
    console.error("Database Error:", error);
    res.status(500).json({ error: "Failed to update database." });
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
