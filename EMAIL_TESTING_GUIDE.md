# 📧 BuildForge Email System - Testing Guide

## Overview

BuildForge now has a complete email notification system following MERN best practices:

- ✅ **Registration Emails** - Welcome emails when new users register
- ✅ **Order Confirmation** - Automatic notifications when orders are created
- ✅ **Generic Email API** - Reusable endpoint for any email needs
- ✅ **Error Handling** - Graceful failures that don't block operations

---

## Installation & Configuration

### 1. Backend Dependencies (Already Installed)

```bash
npm install nodemailer dotenv express
```

### 2. Environment Variables (Already Configured)

Check your `.env` file has these Gmail settings:

```env
EMAIL_USER=buildforge.operations@gmail.com
EMAIL_PASSWORD=hhamtbwzfqspuonb
EMAIL_SERVICE=gmail
```

**Note:** The password is an **App-specific Password**, not your Gmail login password.

---

## Architecture

### Email Service (`backend/services/emailService.js`)

The core service with 4 main functions:

```javascript
// 1. Generic Email Sender
await sendEmail(to, subject, html);

// 2. Registration Email
await sendRegistrationEmail(email, username, role);

// 3. Order Confirmation Email
await sendOrderConfirmationEmail(email, customerName, orderId, priority, items);

// 4. General Notification
await sendNotificationEmail(to, subject, message, actionUrl);
```

**Benefits:**
- Modular and reusable
- Separates concerns (email logic out of routes)
- Easy to test independently
- Supports HTML templates

---

## Testing Endpoints

### 1. Test User Registration Email

**Endpoint:** `POST /api/auth/register`

```bash
curl -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testofficer",
    "email": "test@example.com",
    "password": "password123",
    "role": "SalesOfficer"
  }'
```

**Expected Response:**
```json
{
  "msg": "User registered successfully! A welcome email has been sent."
}
```

**What happens:**
- User is created in database
- HTML welcome email is sent to `test@example.com`
- Email includes: username, email, role, registration date

---

### 2. Test Generic Email Endpoint

**Endpoint:** `POST /api/manager/send-email`

```bash
curl -X POST http://localhost:5001/api/manager/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "recipient@example.com",
    "subject": "Test Email from BuildForge",
    "html": "<h1>Hello!</h1><p>This is a test email.</p>"
  }'
```

**Expected Response:**
```json
{
  "message": "Email sent successfully!",
  "result": { /* Nodemailer response */ }
}
```

---

### 3. Test Order Confirmation Email

**Endpoint:** Create Order in UI or via API

```bash
# First, get a customer ID
curl http://localhost:5001/api/manager/customers

# Create order (this triggers email automatically)
curl -X POST http://localhost:5001/api/manager/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerName": "BuildIt Corp",
    "customerId": "CUSTOMER_ID_HERE",
    "priority": "HIGH",
    "equipmentName": "Concrete Mixer",
    "qty": 3
  }'
```

**What happens:**
- Order is created
- System checks if customer has email in profile
- If email exists, order confirmation is sent to customer
- If no email, notification goes to operations email
- Email includes: Order ID, priority, items, timestamps

---

## Email Flow Diagram

```
User Registration
    ↓
POST /api/auth/register
    ↓
Validate email format
    ↓
Create user in DB
    ↓
sendRegistrationEmail()
    ↓
Nodemailer → Gmail SMTP
    ↓
Welcome email delivered


Create Order
    ↓
POST /api/manager/orders
    ↓
Create order in DB
    ↓
Fetch customer record
    ↓
sendOrderConfirmationEmail() (non-blocking)
    ↓
Nodemailer → Gmail SMTP
    ↓
Order confirmation delivered
    ↓
Return order response
```

---

## Verification Checklist

### ✅ Email Service Setup
- [ ] `backend/services/emailService.js` exists
- [ ] All 4 functions exported properly
- [ ] Nodemailer transporter configured with Gmail

### ✅ Route Integrations
- [ ] `POST /api/auth/register` calls `sendRegistrationEmail()`
- [ ] `POST /api/manager/orders` calls `sendOrderConfirmationEmail()`
- [ ] `POST /api/manager/send-email` endpoint exists and working
- [ ] Email errors don't break the main operation

### ✅ Database Models
- [ ] `User` model has email field (required, unique, validated)
- [ ] `Customer` model has email field (optional, validated)
- [ ] `Order` model has priority field (enum: LOW, MEDIUM, HIGH)

### ✅ Environment Variables
- [ ] `.env` has `EMAIL_USER` set
- [ ] `.env` has `EMAIL_PASSWORD` set
- [ ] Gmail account has 2FA enabled
- [ ] App-specific password created

---

## Frontend Integration

The frontend already has email-related fields:

### Registration Form
Add email input to login/registration component:

```javascript
<input 
  type="email" 
  value={email} 
  onChange={(e) => setEmail(e.target.value)} 
  placeholder="Enter your email"
  required
/>
```

### Customer Management
Add email field when creating/editing customers:

```javascript
<FormField
  label="Email:"
  type="email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  placeholder="customer@example.com"
/>
```

---

## API Reference

### `POST /api/auth/register`
Registers user and sends welcome email

**Request:**
```json
{
  "username": "string",
  "email": "string",
  "password": "string",
  "role": "SalesOfficer|SalesManager|WarehouseManager|StoreKeeper"
}
```

**Response:**
```json
{
  "msg": "User registered successfully! A welcome email has been sent."
}
```

---

### `POST /api/manager/send-email`
Generic email endpoint (use for any custom emails)

**Request:**
```json
{
  "to": "recipient@example.com",
  "subject": "Email Subject",
  "html": "<h1>HTML Content</h1>"
}
```

**Response:**
```json
{
  "message": "Email sent successfully!",
  "result": { /* Nodemailer response */ }
}
```

---

### `POST /api/manager/orders`
Creates order and sends confirmation email (automatic)

**Request:**
```json
{
  "customerName": "string",
  "customerId": "string",
  "priority": "HIGH|MEDIUM|LOW",
  "equipmentName": "string",
  "qty": "number"
}
```

**Response:**
```json
{
  "message": "Order created successfully!",
  "order": { /* Order object */ }
}
```

---

## Email Templates

### 1. Registration Email
- Location: `backend/services/emailService.js` - `sendRegistrationEmail()`
- Colors: Orange/Gold (#f39c12)
- Content: Username, email, role, registration date, next steps
- Responsive design: Mobile-friendly HTML

### 2. Order Confirmation Email
- Location: `backend/services/emailService.js` - `sendOrderConfirmationEmail()`
- Colors: Blue (#2196F3)
- Content: Order ID, date, priority badge, items table
- Priority indicators: Color-coded badges (RED=HIGH, ORANGE=MEDIUM, GREEN=LOW)

### 3. General Notification Email
- Location: `backend/services/emailService.js` - `sendNotificationEmail()`
- Colors: Orange/Gold
- Content: Custom message + optional action button
- Use case: Any custom notification

---

## Troubleshooting

### Email Not Sending?

1. **Check credentials**
```bash
# Verify .env file
cat backend/.env | grep EMAIL
```

2. **Check Gmail app password**
   - Go to Google Account → Security
   - Ensure 2FA is enabled
   - Generate new app-specific password
   - Update `.env` with new password

3. **Check logs**
```bash
# Watch backend console for email errors
# Should show: ✅ Email sent successfully to ...
# Or: ❌ Email sending failed: ...
```

4. **Test basics**
```bash
# Restart backend and reseed database
cd backend
npm start

# In another terminal
node seed.js

# Check console for email test messages
```

### Gmail Blocking Emails?

1. Less secure apps are deprecated
2. Use **App-specific password** instead:
   - Open Google Account settings
   - Navigate to Security tab
   - Generate new app password for "Mail"
   - Use this 16-character password

---

## Production Recommendations

For production deployment, consider:

1. **SendGrid** - High deliverability, templates, analytics
2. **Resend** - Modern Node.js email service
3. **Mailgun** - Powerful API with tracking
4. **AWS SES** - Scalable, cost-effective

### Migration Example (SendGrid)

```javascript
// Change transporter in emailService.js
const transporter = nodemailer.createTransport({
  host: 'smtp.sendgrid.net',
  port: 587,
  auth: {
    user: 'apikey',
    pass: process.env.SENDGRID_API_KEY
  }
});
```

Rest of the code stays the same!

---

## Testing Checklist

- [ ] User registration sends welcome email
- [ ] Order creation sends order confirmation
- [ ] Generic email endpoint works
- [ ] Email validation prevents invalid emails
- [ ] Non-blocking: emails don't crash if sending fails
- [ ] HTML templates render correctly
- [ ] Priority badges display with correct colors

---

## Support

If emails aren't sending:
1. Check backend console for error messages
2. Verify Gmail app password in `.env`
3. Test with `POST /api/manager/send-email` endpoint
4. Check recipient email spam folder
5. Enable less secure app access (temporary testing only)

---

## Next Steps

1. ✅ Reset database: `node seed.js`
2. ✅ Start backend: `npm start`
3. ✅ Start frontend: `npm start`
4. ✅ Test user registration email
5. ✅ Create order and verify confirmation email
6. ✅ Test generic email endpoint

**All changes follow MERN best practices with proper modularization and error handling!** 🚀
