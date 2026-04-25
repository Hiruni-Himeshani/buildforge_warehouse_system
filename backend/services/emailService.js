const nodemailer = require('nodemailer');
require('dotenv').config();

/**
 * 📧 Email Service for BuildForge
 * Handles: Customer Registration confirmations, Order submission confirmations
 */

// 🔧 Configure Nodemailer Transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,      // buildforge.operations@gmail.com
    pass: process.env.EMAIL_PASSWORD   // App-specific password from .env
  }
});

/**
 * 📧 Generic Email Sender Function
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - HTML email body
 * @returns {Promise} - Email send result
 */
const sendEmail = async (to, subject, html) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to,
      subject,
      html
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${to}`);
    return { success: true, result };
  } catch (error) {
    console.error(`❌ Email failed to ${to}:`, error.message);
    return { success: false, error: error.message };
  }
};

/**
 * 👤 Send Customer Registration Confirmation Email
 * Called when a new customer is registered (Admin/Sales Officer adds customer)
 * @param {string} email - Customer's email
 * @param {string} fullName - Customer's full name
 * @param {string} shopName - Customer's shop name
 * @returns {Promise}
 */
const sendCustomerRegistrationEmail = async (email, fullName, shopName) => {
  const registrationDate = new Date().toLocaleString();

  const html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #27ae60 0%, #229954 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; }
        .content { padding: 20px; }
        .detail-box { background-color: #f0fdf4; padding: 15px; border-left: 4px solid #27ae60; margin: 15px 0; }
        .detail-label { font-weight: bold; color: #1e3a1f; }
        .detail-value { color: #2d5016; margin-top: 5px; }
        .footer { background-color: #eceff1; padding: 15px; text-align: center; font-size: 12px; color: #7f8c8d; border-radius: 0 0 8px 8px; }
        .highlight { background-color: #ccf0d9; padding: 2px 6px; border-radius: 3px; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✅ Welcome to BuildForge!</h1>
            <p>Customer Registration Successful</p>
        </div>
        
        <div class="content">
            <p style="font-size: 16px; color: #2c3e50;">Dear <strong>${fullName}</strong>,</p>
            
            <p style="color: #34495e; line-height: 1.6;">
                Your business has been successfully registered with <strong>BuildForge Warehouse Management System</strong>. 
                You can now place orders and manage your warehouse operations through our platform.
            </p>
            
            <div class="detail-box">
                <div class="detail-label">📋 Registration Details:</div>
                <div class="detail-value">
                    <p><strong>Full Name:</strong> ${fullName}</p>
                    <p><strong>Shop Name:</strong> ${shopName}</p>
                    <p><strong>Email:</strong> ${email}</p>
                    <p><strong>Registered On:</strong> ${registrationDate}</p>
                    <p><strong>Status:</strong> <span class="highlight">Active</span></p>
                </div>
            </div>
            
            <div class="detail-box">
                <div class="detail-label">🚀 Next Steps:</div>
                <div class="detail-value">
                    <p>1. Login to BuildForge Portal at <strong>http://localhost:3000</strong></p>
                    <p>2. Browse available equipment and inventory</p>
                    <p>3. Create your first order</p>
                    <p>4. Track orders and manage deliveries</p>
                </div>
            </div>
            
            <p style="color: #34495e; font-size: 14px; margin-top: 20px;">
                If you have any questions or need support, please contact our operations team.
            </p>
        </div>
        
        <div class="footer">
            <p>© 2026 BuildForge Warehouse Management System. All rights reserved.</p>
            <p>This is an automated email. Please do not reply to this message.</p>
        </div>
    </div>
</body>
</html>
  `;

  return sendEmail(email, `✅ Welcome to BuildForge - Registration Successful`, html);
};

/**
 * 📦 Send Order Submission Confirmation Email
 * Called when an order is created successfully
 * @param {string} email - Customer email
 * @param {string} customerName - Customer name
 * @param {string} orderId - Order ID
 * @param {string} priority - Order priority
 * @param {Array} items - Order items
 * @returns {Promise}
 */
const sendOrderConfirmationEmail = async (email, customerName, orderId, priority, items) => {
  const orderDate = new Date().toLocaleString();
  
  const itemsList = items
    .map(item => `<tr style="border-bottom: 1px solid #ddd;">
      <td style="padding: 10px; text-align: left;">${item.itemName}</td>
      <td style="padding: 10px; text-align: center;">${item.qty}</td>
    </tr>`)
    .join('');

  const priorityColor = priority === 'HIGH' ? '#d32f2f' : priority === 'MEDIUM' ? '#f57c00' : '#388e3c';
  const priorityBg = priority === 'HIGH' ? '#ffcdd2' : priority === 'MEDIUM' ? '#ffe0b2' : '#c8e6c9';
  const priorityIcon = priority === 'HIGH' ? '🔴' : priority === 'MEDIUM' ? '🟡' : '🟢';

  const html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #2196F3 0%, #1976d2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { padding: 20px; }
        .order-info { background-color: #f9fcfc; padding: 15px; border-left: 4px solid #2196F3; margin: 15px 0; }
        .priority-badge { background-color: ${priorityBg}; color: ${priorityColor}; padding: 8px 12px; border-radius: 4px; font-weight: bold; display: inline-block; }
        .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .items-table th { background-color: #eceff1; padding: 12px; text-align: left; font-weight: bold; border: 1px solid #cfd8dc; }
        .footer { background-color: #eceff1; padding: 15px; text-align: center; font-size: 12px; color: #7f8c8d; border-radius: 0 0 8px 8px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📦 Order Confirmation</h1>
            <p>BuildForge Warehouse System</p>
        </div>
        
        <div class="content">
            <p style="font-size: 16px; color: #2c3e50;">Hello <strong>${customerName}</strong>,</p>
            
            <p style="color: #34495e; line-height: 1.6;">
                Your order has been successfully submitted! We've received your request and will process it shortly.
            </p>
            
            <div class="order-info">
                <p><strong>Order ID:</strong> #${orderId}</p>
                <p><strong>Submission Date:</strong> ${orderDate}</p>
                <p><strong>Priority Level:</strong> <span class="priority-badge">${priorityIcon} ${priority}</span></p>
            </div>
            
            <h3 style="color: #2c3e50; margin-top: 25px;">📋 Order Items:</h3>
            <table class="items-table">
                <thead>
                    <tr>
                        <th>Equipment</th>
                        <th>Quantity</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsList}
                </tbody>
            </table>
            
            <p style="color: #34495e; font-size: 14px; margin-top: 20px;">
                Your order is now in our system. You can track the status through your BuildForge account. 
                Our team will process this order according to its priority level.
            </p>
            
            <div style="background-color: #e3f2fd; padding: 15px; border-radius: 4px; margin-top: 20px;">
                <p style="margin: 0; color: #1565c0;"><strong>💡 Tip:</strong> Check your order status anytime by logging into your BuildForge account.</p>
            </div>
        </div>
        
        <div class="footer">
            <p>© 2026 BuildForge Warehouse Management System. All rights reserved.</p>
            <p>Questions? Contact our support team.</p>
        </div>
    </div>
</body>
</html>
  `;

  return sendEmail(email, `📦 Order Confirmation - #${orderId}`, html);
};

module.exports = {
  sendEmail,
  sendCustomerRegistrationEmail,
  sendOrderConfirmationEmail
};

