const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer'); 
const twilio = require('twilio');

// 🧠 Import your team's new MongoDB Models!
const Equipment = require('../models/equipment');
const Order = require('../models/Order');
const Customer = require('../models/Customer');
const { assertFitsInAisle } = require('../utils/aisleCapacity');

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

// 📧 EMAIL SETUP
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'buildforge.operations@gmail.com',
        pass: 'hhamtbwzfqspuonb'
    }
});

// 📱 TWILIO SMS SETUP
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
const twilioClient = new twilio(accountSid, authToken);

// We keep settings in memory for now so your emails/SMS still work perfectly!
let systemSettings = {
    operationsEmail: 'buildforge.operations@gmail.com', 
    operationsPhone: '+94770000000'                    
};

// ========== 📦 INVENTORY ROUTES (Cloud Connected) ==========
router.get('/inventory', async (req, res) => {
    try {
        const list = await Equipment.find().sort({ name: 1 });
        res.json(list.map(toInventoryRow));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/inventory', async (req, res) => {
    try {
        const { itemName, availableQty, location } = req.body;
        const name = itemName !== undefined ? String(itemName).trim() : '';
        const qty = Number(availableQty);
        const loc = location !== undefined ? String(location).trim() : '';

        if (!name) {
            return res.status(400).json({ error: 'itemName is required' });
        }
        if (Number.isNaN(qty) || qty < 0) {
            return res.status(400).json({ error: 'availableQty must be a non-negative number' });
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
        res.json({ message: 'Equipment added successfully!', equipment: toInventoryRow(newEquipment) });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ========== � CUSTOMER ROUTES (Sales Officer) ==========
router.get('/customers', async (req, res) => {
    try {
        console.log('[manager] GET /customers called');
        const customers = await Customer.find().sort({ createdAt: -1 });
        console.log(`[manager] GET /customers returned ${customers.length} records`);
        res.json(customers);
    } catch (err) {
        console.error('[manager] GET /customers failed:', err.message);
        res.status(500).json({ error: err.message });
    }
});

router.post('/customers', async (req, res) => {
    try {
        console.log('[manager] POST /customers called with payload:', req.body);
        const { fullName, shopName, contactNumber, address, status } = req.body;
        if (!fullName || !fullName.trim()) return res.status(400).json({ error: 'Full Name is required' });
        if (!shopName || !shopName.trim()) return res.status(400).json({ error: 'Shop Name is required' });
        if (!contactNumber || !contactNumber.trim()) return res.status(400).json({ error: 'Contact Number is required' });
        if (!address || !address.trim()) return res.status(400).json({ error: 'Address is required' });

        const customer = new Customer({
            fullName: fullName.trim(),
            shopName: shopName.trim(),
            contactNumber: contactNumber.trim(),
            address: address.trim(),
            status: status && ['Pending', 'Active', 'Inactive'].includes(status) ? status : 'Active'
        });
        await customer.save();
        console.log('[manager] POST /customers succeeded:', customer._id);
        res.status(201).json({ message: 'Customer created', customer });
    } catch (err) {
        console.error('[manager] POST /customers failed:', err.message);
        res.status(500).json({ error: err.message });
    }
});

router.put('/customers/:id', async (req, res) => {
    try {
        console.log('[manager] PUT /customers/' + req.params.id + ' called with payload:', req.body);
        const { fullName, shopName, contactNumber, address, status } = req.body;
        const customer = await Customer.findById(req.params.id);
        if (!customer) return res.status(404).json({ error: 'Customer not found' });

        customer.fullName = fullName ? fullName.trim() : customer.fullName;
        customer.shopName = shopName ? shopName.trim() : customer.shopName;
        customer.contactNumber = contactNumber ? contactNumber.trim() : customer.contactNumber;
        customer.address = address ? address.trim() : customer.address;
        if (status && ['Pending','Active','Inactive'].includes(status)) customer.status = status;

        await customer.save();
        console.log('[manager] PUT /customers/' + req.params.id + ' succeeded');
        res.json({ message: 'Customer updated', customer });
    } catch (err) {
        console.error('[manager] PUT /customers/' + req.params.id + ' failed:', err.message);
        res.status(500).json({ error: err.message });
    }
});

router.delete('/customers/:id', async (req, res) => {
    try {
        console.log('[manager] DELETE /customers/' + req.params.id + ' called');
        const customer = await Customer.findById(req.params.id);
        if (!customer) return res.status(404).json({ error: 'Customer not found' });

        await customer.deleteOne();
        console.log('[manager] DELETE /customers/' + req.params.id + ' succeeded');
        res.json({ message: 'Customer deleted' });
    } catch (err) {
        console.error('[manager] DELETE /customers/' + req.params.id + ' failed:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ========== �📜 ORDER ROUTES (Cloud Connected) ==========
router.get('/orders', async (req, res) => {
    try {
        const orders = await Order.find().sort({ createdAt: -1 }); // Newest first
        res.json(orders);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/orders', async (req, res) => {
    try {
        console.log('[manager] POST /orders called with payload:', req.body);
        const selectedCustomerName = req.body.customerName;
        const selectedCustomerId = req.body.customerId || null;

        const newOrder = new Order({
            customerId: selectedCustomerId,
            customerName: selectedCustomerName,
            priority: req.body.priority || 'Normal',
            status: 'Pending',
            itemsRequested: [{ 
                itemName: req.body.equipmentName, 
                qty: Number(req.body.qty), 
                pickedQty: 0 
            }]
        });
        await newOrder.save();
        console.log('[manager] POST /orders succeeded:', newOrder._id);
        res.json({ message: "Order created successfully!", order: newOrder });
    } catch (err) {
        console.error('[manager] POST /orders failed:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ========== 🛑 CANCELLATION AUDIT TRAIL ==========
router.put('/orders/:id/cancel', async (req, res) => {
    try {
        const { cancellationCategory, cancellationReason } = req.body;
        const order = await Order.findById(req.params.id);
        
        if (!order) return res.status(404).json({ error: "Order not found" });
        
        order.status = 'Cancelled';
        order.cancellationCategory = cancellationCategory;
        order.cancellationReason = cancellationReason;
        order.cancelledAt = new Date();
        
        await order.save();
        res.json({ message: "Order moved to Cancellation Audit Trail!", order });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ========== ✅ APPROVAL ROUTE ==========
router.put('/orders/:id/approve', async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ error: "Order not found" });
        
        order.status = 'Approved'; // Matches your exact Schema Enum!

        // Loop through items to update Inventory in the cloud
        for (let requestedItem of order.itemsRequested) {
            const inventoryItem = await Equipment.findOne({ name: requestedItem.itemName });

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
                action: 'Reserved',
                itemName: requestedItem.itemName,
                qty: requestedItem.qty,
                notes: 'Order approved and stock reserved'
            });
        }
        
        await order.save(); // Save the updated order to the cloud
        res.json({ message: "Order Approved Successfully!", order });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ========== 👷‍♂️ PICKING WORKFLOW ==========
router.post('/orders/:id/generate-picklist', async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ error: "Order not found" });
        
        order.status = 'Picking';
        order.pickingStartedAt = new Date();
        await order.save();
        
        const pickList = {
            pickListId: 'PL-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
            orderId: order._id,
            customerName: order.customerName,
            items: order.itemsRequested.map(item => ({
                itemName: item.itemName,
                requiredQty: item.qty,
                pickedQty: item.pickedQty || 0
            })),
            createdAt: new Date()
        };

        res.json({ message: "Pick List generated successfully!", order, pickList });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/orders/:id/confirm-pick', async (req, res) => {
    try {
        const { itemName, pickedQty, warehouseStaff } = req.body;
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ error: "Order not found" });
        
        const item = order.itemsRequested.find(i => i.itemName === itemName);
        if (item) item.pickedQty += pickedQty;
        
        order.stockMovements.push({
            itemName: itemName,
            qty: pickedQty,
            action: 'Picked',
            notes: `Picked by ${warehouseStaff}`
        });
        
        // Check if all items are picked
        const allPicked = order.itemsRequested.every(i => i.pickedQty >= i.qty);
        if (allPicked) {
            order.status = 'Ready for Gate Pass';
            order.pickingCompletedAt = new Date();
            order.pickedBy = warehouseStaff;
        }
        
        await order.save();
        res.json({ message: "Item picked successfully!", order });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ========== 🚚 GATE PASS & DISPATCH ==========
router.post('/orders/:id/generate-gatepass', async (req, res) => {
    try {
        const { driverName, dispatchLocation, vehicleNumber, vehicleType } = req.body;
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ error: 'Order not found' });
        if (order.status !== 'Ready for Gate Pass') {
            return res.status(400).json({ error: 'Order must be ready for gate pass before generating one' });
        }
        
        order.gatePassNumber = 'GP-' + Math.random().toString(36).substr(2, 9).toUpperCase();
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
            items: order.itemsRequested.map(item => ({
                itemName: item.itemName,
                qty: item.pickedQty || item.qty
            }))
        };

        res.json({ message: "Gate Pass generated!", gatePass });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/orders/:id/dispatch', async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ error: 'Order not found' });
        if (order.status !== 'Ready for Gate Pass') {
            return res.status(400).json({ error: 'Order must be Ready for Gate Pass before dispatching' });
        }

        order.status = 'Dispatched';

        for (let requestedItem of order.itemsRequested) {
            const inventoryItem = await Equipment.findOne({ name: requestedItem.itemName });

            if (inventoryItem) {
                const dispatchQty = requestedItem.pickedQty > 0 ? requestedItem.pickedQty : requestedItem.qty;
                if (dispatchQty > inventoryItem.quantity) {
                    return res.status(400).json({
                        error: `Cannot dispatch ${dispatchQty} of "${requestedItem.itemName}": only ${inventoryItem.quantity} on hand.`,
                    });
                }
                inventoryItem.quantity -= dispatchQty;
                inventoryItem.reservedQty = Math.max(0, inventoryItem.reservedQty - dispatchQty);
                await inventoryItem.save();
            }

            order.stockMovements.push({
                itemName: requestedItem.itemName,
                qty: requestedItem.pickedQty > 0 ? requestedItem.pickedQty : requestedItem.qty,
                action: 'Dispatched',
                notes: `Dispatched in vehicle ${order.vehicleNumber || 'N/A'}`
            });
        }

        await order.save();
        res.json({ message: "Order Dispatched! Inventory updated.", order });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ========== ⚠️ EMERGENCY & REPORTS ==========
router.post('/orders/:id/damage-report', async (req, res) => {
    try {
        const { itemName, qty, reason, reportedBy } = req.body;
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ error: 'Order not found' });
        
        const item = order.itemsRequested.find(i => i.itemName === itemName);
        if (!item) return res.status(404).json({ error: 'Item not found in order' });
        item.pickedQty -= qty;
        
        order.damageReports.push({ itemName, qty, reason, reportedBy });
        order.stockMovements.push({ action: 'Damaged', itemName, qty, notes: reason });
        
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

router.get('/orders/:id/stock-movements', async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ error: 'Order not found' });
        res.json({ orderId: order._id, customerName: order.customerName, stockMovements: order.stockMovements, damageReports: order.damageReports });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/stock-movements', async (req, res) => {
    try {
        const orders = await Order.find();
        const allMovements = orders.reduce((acc, order) => {
            order.stockMovements.forEach(movement => {
                acc.push({ orderId: order._id, customerName: order.customerName, ...movement.toObject ? movement.toObject() : movement });
            });
            return acc;
        }, []);
        allMovements.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        res.json(allMovements);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ========== ⚠️ EMERGENCY & REPORTS ==========
router.put('/orders/:id/backorder', async (req, res) => { 
    try {
        // 1. FIRST: Safely update the database
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ error: "Order not found" });
        
        order.status = 'Backordered'; // Move it to the Backordered table!
        await order.save();

        let equipmentList = order.itemsRequested.map(item => `- ${item.qty}x ${item.itemName}`).join('\n');
        
        // 2. SECOND: Try to send alerts inside a "Safe Zone"
        try {
            const mailOptions = {
                from: 'BuildForge System',
                to: systemSettings.operationsEmail, 
                subject: `⚠️ URGENT: Manufacturing Request for ${order.customerName}`,
                text: `Operations Team,\n\nUrgent stock shortage for:\n${equipmentList}\n\nCustomer: ${order.customerName}`
            };

            await transporter.sendMail(mailOptions);
            
            // Only try SMS if Twilio is actually set up in your .env
            if (process.env.TWILIO_ACCOUNT_SID) {
                await twilioClient.messages.create({
                    body: `🏗️ BuildForge Alert: Urgent stock shortage for ${order.customerName}. Email sent.`,
                    from: twilioPhoneNumber,
                    to: systemSettings.operationsPhone
                });
            }

            // If everything works perfectly:
            return res.json({ message: "Order Backordered! Alerts delivered successfully." });

        } catch (alertError) {
            // 🛡️ If Twilio or Email fails, it comes here INSTEAD of crashing!
            console.log("⚠️ Note: Email/SMS failed, but database was updated.");
            return res.json({ message: "Order Backordered! (Email/SMS alerts currently offline)", order });
        }

    } catch (error) { 
        console.error("Database Error:", error);
        res.status(500).json({ error: "Failed to update database." }); 
    }
});

// ========== ⚙️ SETTINGS ==========
router.get('/settings', (req, res) => res.json(systemSettings));
router.put('/settings', (req, res) => {
    systemSettings.operationsEmail = req.body.operationsEmail;
    systemSettings.operationsPhone = req.body.operationsPhone;
    res.json({ message: "Settings saved!", settings: systemSettings });
});

module.exports = router;