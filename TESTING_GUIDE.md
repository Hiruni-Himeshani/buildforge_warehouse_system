# 🧪 BuildForge Warehouse Dispatch System - Complete Testing Guide

This guide will help you test all the newly implemented features of the Warehouse Dispatch & Stock Control component (Component 4).

---

## 📋 Prerequisites

1. **Backend Server Running**: Start the backend on port 5001
```bash
cd backend
npm install
node server.js
```

2. **Frontend App Running**: Start the frontend on port 3000
```bash
cd frontend
npm install
npm start
```

3. **MongoDB Connection**: Ensure MongoDB is running (or the backend uses in-memory database)

---

## 🔐 Test Users & Login Credentials

Use these credentials to test different roles:

| Role | Username | Password | Module |
|------|----------|----------|--------|
| **Sales Manager** | manager | password | Order Approval |
| **Sales Officer** | officer | password | Order Creation |
| **Warehouse Manager** | warehouse | password | Pick List, Gate Pass, Dispatch |
| **Store Keeper** | keeper | password | Inventory Management |

---

## ✅ Test Scenario 1: Create and Approve an Order

### Step 1: Login as Sales Officer
1. Open browser to `http://localhost:3000`
2. Login with:
   - Username: `officer`
   - Password: `password`

### Step 2: Create an Order
1. Click **"Create Order"** in the sidebar
2. Fill in the form:
   - **Customer Name**: "Test Customer ABC"
   - **Equipment Name**: "Concrete Mixer"
   - **Quantity**: 5
   - **Priority**: "High"
3. Click **"Submit Order"**
4. ✅ Verify: Toast message appears: "✅ Order created successfully!"

### Step 3: Approve Order (as Sales Manager)
1. Logout (if needed) and login as Sales Manager:
   - Username: `manager`
   - Password: `password`
2. Click **"Dashboard"** in the sidebar
3. Look for your newly created order in the "Pending Orders" section
4. Click **"Review"** button
5. In the popup, click **"✅ Approve"**
6. ✅ Verify: Toast shows "✅ Order Approved Successfully!"
7. Order status changes to **"Approved (Pending Dispatch)"**
8. Reserved inventory increases by 5 for Concrete Mixer

---

## 📋 Test Scenario 2: Generate Pick List

### Step 1: Login as Warehouse Manager
1. Logout and login as Warehouse Manager:
   - Username: `warehouse`
   - Password: `password`

### Step 2: Access Pick List Page
1. Click **"Pick List"** in the sidebar
2. You should see the approved order in the table

### Step 3: Generate Pick List
1. Click **"Generate Pick List"** for your order
2. ✅ Verify:
   - Pick list form appears
   - Pick List ID is displayed (e.g., "PL-ABC123XYZ")
   - All items are shown with their required quantities

### Step 4: Enter Warehouse Staff Name
1. Enter a name in **"Warehouse Staff Name"** field (e.g., "John Smith")

### Step 5: Confirm Picks
1. For each item, enter the quantity to pick in **"Pick Now"** field
2. Click **"Confirm"** button
3. ✅ Verify:
   - Item status updates to "✓ Done" when all items are picked
   - Toast shows "✅ Xpx ItemName picked!"
   - "Already Picked" column updates

### Step 6: Completion
1. When all items are picked, you'll see a green message: **"✅ All items picked! Ready for Gate Pass generation."**

---

## 🚪 Test Scenario 3: Generate Gate Pass

### Step 1: Access Gate Pass Page
1. Click **"Gate Pass"** in the sidebar
2. You should see orders in "Ready for Gate Pass" status

### Step 2: Generate Gate Pass
1. Click **"Generate Gate Pass"** for your order
2. ✅ Verify:
   - Gate pass number is generated (e.g., "GP-XYZ789ABC")
   - Customer name, items, and picked quantities are displayed
   - Order status changes to **"Ready for Gate Pass"**

### Step 3: Print/Download Gate Pass
1. Click **"🖨️ Print"** to print the document
2. Click **"📥 Download"** to save as text file
3. ✅ Verify:
   - Gate pass document is properly formatted
   - All required fields are filled
   - Signature lines are present for authorization

---

## 🚚 Test Scenario 4: Dispatch Order

### Step 1: Access Dispatch Center
1. Click **"Dispatch Center"** in the sidebar

### Step 2: View All Orders
1. You can filter orders by status:
   - **📋 Pending**: Orders approved but not yet picked
   - **📦 Picking**: Currently being picked
   - **🚪 Gate Pass**: Ready for dispatch
   - **✅ Dispatched**: Already dispatched

### Step 3: Dispatch the Order
1. Find your order with status **"Ready for Gate Pass"**
2. Click **"Dispatch"** button
3. ✅ Verify:
   - Status changes to **"Dispatched"**
   - Toast shows "🚚 Order Dispatched from Warehouse!"
   - Inventory is automatically updated:
     - Available quantity decreases
     - Reserved quantity decreases

### Step 4: Verify Inventory Update
1. Login as **Store Keeper** (username: `keeper`, password: `password`)
2. Click **"Inventory Management"** in sidebar
3. ✅ Verify:
   - "Net Available" column shows reduced quantity
   - (Physical Stock - Reserved) = Net Available

---

## ⚠️ Test Scenario 5: Report Damage

### Step 1: Create Damage Report
1. As Warehouse Manager, click **"Damage Report"** in sidebar
2. In the left panel, select an order in **"Picking"** or **"Ready for Gate Pass"** status

### Step 2: Fill Damage Details
1. Select the **"Equipment Item"** that was damaged
2. Enter **"Damaged Quantity"** (e.g., 2)
3. Select **"Reason for Damage"**:
   - "Broken/Damaged in transit"
   - "Manufacturing defect"
   - "Environmental damage (rust, corrosion, etc)"
   - "Theft/Missing parts"
   - "Collision damage"
   - "Contamination"
   - "Other"
4. Enter **"Reported By"** (your name)
5. Click **"⚠️ Report Damage"**

### Step 3: Verify Damage Report
1. ✅ Verify:
   - Toast shows "⚠️ Damage report recorded!"
   - Damage history table appears at the bottom
   - Picked quantity is reduced by damaged amount
   - Inventory is restored (available quantity increases)

### Step 4: Check Stock Movement
1. Click **"Stock Movements"** in sidebar
2. Select **"By Order"** tab
3. Select the same order
4. ✅ Verify:
   - You see a red "Damage Report" entry with:
     - Item name
     - Damaged quantity
     - Reason
     - Who reported it
     - Timestamp

---

## 📊 Test Scenario 6: View Stock Movement History

### Step 1: Access Stock Movements
1. Click **"Stock Movements"** in sidebar

### Step 2: View All Movements
1. Click **"All Movements"** tab
2. ✅ Verify: You see a complete audit trail:
   - Reserved (when order approved)
   - Picked (when items picked)
   - Damaged (if damage reported)
   - Dispatched (when order dispatched)

### Step 3: View Order-Specific Movements
1. Click **"By Order"** tab
2. Select an order from the dropdown
3. ✅ Verify:
   - All movements for that order are displayed
   - Movements are color-coded by action type
   - Damage reports section shows if any damages exist
   - Each entry includes timestamp and notes

---

## 🔄 Test Scenario 7: Complete Workflow (End-to-End)

Follow this sequence to test the complete workflow:

1. **📝 Create Order** (as Sales Officer)
   - Create order: 10x Jackhammer
   - Order ID: Note down (e.g., "abc123")

2. **✅ Approve Order** (as Sales Manager)
   - Login as manager
   - Approve the pending order
   - Status: "Approved (Pending Dispatch)"
   - Inventory reserved: 10

3. **📋 Generate Pick List** (as Warehouse Manager)
   - Go to Pick List page
   - Enter staff name: "Mike Johnson"
   - Pick all 10 items
   - Status: "Ready for Gate Pass"

4. **🚪 Generate Gate Pass**
   - Go to Gate Pass page
   - Generate gate pass
   - Print/Download for records

5. **⚠️ Report Damage (Optional)**
   - Report 2 items damaged
   - Inventory restored
   - Picked quantity updated to 8

6. **🚚 Dispatch Order**
   - Go to Dispatch Center
   - Dispatch the order
   - Status: "Dispatched"
   - Inventory final check: 10 - 2 (damaged) = 8 items dispatched

7. **📊 Verify History**
   - Check Stock Movements
   - See complete audit trail:
     - Reserved 10
     - Picked 10
     - Damaged 2
     - Dispatched 8

---

## 🧪 API Testing (Using Postman or cURL)

### Create Order
```
POST http://localhost:5001/api/manager/orders
Content-Type: application/json

{
  "customerName": "BuildIt Corp",
  "priority": "High",
  "equipmentName": "Steel Scaffolding",
  "qty": 10
}
```

### Approve Order
```
PUT http://localhost:5001/api/manager/orders/101/approve
```

### Generate Pick List
```
POST http://localhost:5001/api/manager/orders/101/generate-picklist
```

### Confirm Pick
```
PUT http://localhost:5001/api/manager/orders/101/confirm-pick
Content-Type: application/json

{
  "itemName": "Steel Scaffolding",
  "pickedQty": 10,
  "warehouseStaff": "John Smith"
}
```

### Generate Gate Pass
```
POST http://localhost:5001/api/manager/orders/101/generate-gatepass
```

### Dispatch Order
```
PUT http://localhost:5001/api/manager/orders/101/dispatch
```

### Report Damage
```
POST http://localhost:5001/api/manager/orders/101/damage-report
Content-Type: application/json

{
  "itemName": "Steel Scaffolding",
  "qty": 2,
  "reason": "Broken/Damaged in transit",
  "reportedBy": "Mike Johnson"
}
```

### View Stock Movements
```
GET http://localhost:5001/api/manager/orders/101/stock-movements
```

### View All Stock Movements
```
GET http://localhost:5001/api/manager/stock-movements
```

---

## ✨ Key Features to Verify

### Pick List System
- ✅ Pick list generated with unique ID
- ✅ Shows all items with required quantities
- ✅ Tracks picked quantities
- ✅ Prevents over-picking
- ✅ Marks completion when all items picked

### Gate Pass Management
- ✅ Gate pass number is generated
- ✅ Professional format with signature lines
- ✅ Print functionality works
- ✅ Download as text file works
- ✅ All necessary fields are captured

### Stock Control
- ✅ Item status transitions are correct:
  - Pending → Approved → Picking → Ready for Gate Pass → Dispatched
- ✅ Inventory updates correctly at each step
- ✅ Available quantity = Physical Stock - Reserved
- ✅ Damage reporting reduces picked quantity
- ✅ Inventory restoration works after damage

### Audit Trail
- ✅ All actions logged with timestamps
- ✅ Stock movements categorized by action type
- ✅ Damage reports linked to orders
- ✅ Warehouse staff names recorded
- ✅ Complete traceability of each item

### Data Consistency
- ✅ No over-allocation of inventory
- ✅ Reserved quantities match approved orders
- ✅ Picked quantities don't exceed requested
- ✅ Dispatched quantities match picked quantities
- ✅ Damage adjustments reduce available stock

---

## 🐛 Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| "Order not found" error | Ensure order ID exists. Check browser console for correct ID. |
| Pick list won't generate | Order must be in "Approved (Pending Dispatch)" status. Approve first. |
| Gate pass won't generate | All items must be picked. Complete all picks first. |
| Cannot report damage | Order must be in "Picking" or "Ready for Gate Pass" status. |
| Inventory not updating | Check if dispatch was successful. Reload page to see updates. |
| Toast messages not showing | Ensure react-toastify is installed: `npm install react-toastify` |

---

## 📊 Expected Data Flow

```
Order Created
    ↓
Order Approved (Stock Reserved)
    ↓
Pick List Generated
    ↓
Items Picked (Stock Movement: "Picked" logged)
    ↓
Gate Pass Generated
    ↓
[Optional] Damage Reported (Inventory Adjusted)
    ↓
Order Dispatched (Stock Deducted from Available)
    ↓
Complete ✓
```

---

## 🎯 Testing Checklist

- [ ] Create order as Sales Officer
- [ ] Approve order as Sales Manager
- [ ] Generate pick list as Warehouse Manager
- [ ] Confirm all items picked
- [ ] Generate gate pass
- [ ] Print/Download gate pass
- [ ] Dispatch order
- [ ] Verify inventory updated
- [ ] Report damage on second order
- [ ] Check stock movement history
- [ ] Verify complete audit trail
- [ ] Test all filter options in Dispatch Center
- [ ] Test all view options in Stock Movements
- [ ] Verify data consistency across pages

---

## 🚀 You're All Set!

All features have been implemented and tested. The system now provides:

✅ Complete warehouse dispatch workflow  
✅ Pick list generation and tracking  
✅ Gate pass management with printing  
✅ Comprehensive stock movement audit trail  
✅ Damage reporting and inventory adjustment  
✅ Real-time inventory tracking  

Happy testing! 🎉
