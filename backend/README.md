# BuildForge Outbound Warehouse Management System

## 📌 Project Overview

This project is a web-based **Outbound Warehouse Management System** developed for **BuildForge Construction Equipment (Pvt) Ltd**.

The system is designed to manage outbound warehouse operations efficiently, including:

- Equipment inventory management  
- Sales order processing  
- Order approval and stock reservation  
- Warehouse dispatch and stock updates  

---

## 🎯 Objectives

- Digitize warehouse inventory management  
- Enable efficient and structured order processing  
- Prevent stock over-allocation using reservation mechanisms  
- Improve coordination between departments  
- Introduce predictive stock shortage alerts  

---

## 🧩 System Modules

### 1️⃣ Equipment & Inventory Management (Store Keeper)

- Add, update, and delete equipment  
- Manage stock quantity and warehouse locations  
- Handle damaged equipment and stock adjustments  

---

### 2️⃣ Sales Order Management (Sales Officer)

- Manage customer details  
- Create, update, and delete sales orders  
- View order history  

---

### 3️⃣ Order Approval & Stock Reservation (Sales Manager)

- Validate stock availability  
- Approve or reject orders  
- Reserve stock for confirmed orders  
- Manage priority-based order queue  

---

### 4️⃣ Warehouse Dispatch & Stock Control (Warehouse Manager)

- Manage dispatch operations  
- Generate invoices and vehicle gate passes  
- Update stock after dispatch  
- Maintain stock movement records  

---

## 🚀 Novel Features

### 🔹 Priority-Based Order Approval System
- Orders are assigned priority levels (**High / Medium / Low**)  
- Sales Manager can process high-priority orders first  
- Improves decision-making and order handling efficiency  

---

### 🔹 Predictive Stock Shortage Alert
- Uses historical dispatch data  
- Calculates average stock usage  
- Generates alerts when stock is predicted to run low  
- Helps in proactive production planning  

---

## 👥 Team Structure

- **Store Keeper** – Inventory Management  
- **Sales Officer** – Order Management  
- **Sales Manager** – Approval & Reservation (Movindu) 
- **Warehouse Manager** – Dispatch & Stock Control  

---

## 📈 Key Benefits

- Real-time stock visibility  
- Reduced manual errors  
- Faster order processing  
- Better inter-department coordination  
- Data-driven decision making  

---

## 🧑‍💼 Sales Officer Enhancements

This release includes a full Sales Officer workflow for customer registration, order creation, and history review.

### Customer Management
- Add new customers with required fields: **Full Name**, **Shop Name**, **Contact Number**, **Address**  
- View all registered customers in a dedicated officer page  
- Edit customer details with status control (**Active / Pending / Inactive**)  
- Delete customer records directly from the officer UI  
- Toast notifications confirm success or show errors for officer actions  

### Order Creation
- Select registered customers and available inventory when creating orders  
- Orders save to the database with default status **Pending**  
- Order creation page supports priority selection and quantity entry  
- Toast notifications provide clear feedback for order submission  

### Order History
- Order history page now displays a complete order table  
- Includes **Order ID**, **Customer**, **Priority**, **Items**, **Status**, and **Created At**  
- Works for all users with shared backend order data  

### Backend & Integration
- `POST /api/manager/customers` for customer registration  
- `PUT /api/manager/customers/:id` for customer updates  
- `DELETE /api/manager/customers/:id` for customer removal  
- `GET /api/manager/customers` for customer list  
- `POST /api/manager/orders` for order creation  
- `GET /api/manager/orders` for order history  
- Added backend logging for success and error tracking in manager routes  

---

