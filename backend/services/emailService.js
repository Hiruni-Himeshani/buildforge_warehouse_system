const nodemailer = require("nodemailer");
const { templates } = require("../config/emailTemplates");
require("dotenv").config();

/**
 * 📧 Email Service for BuildForge
 * Handles: Customer Registration confirmations, Order submission confirmations
 * Uses configurable templates from config/emailTemplates.js
 */

// 🔧 Configure Nodemailer Transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER, // buildforge.operations@gmail.com
    pass: process.env.EMAIL_PASSWORD, // App-specific password from .env
  },
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
      html,
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
  const template = templates.customerRegistration;
  const subject = template.subject;
  const html = template.getBody(fullName, shopName, email);

  return sendEmail(email, subject, html);
};

/**
 * 📦 Send Order Submission Confirmation Email
 * Called when an order is created successfully
 * Uses dynamic SLA information based on priority level
 * @param {string} email - Customer email
 * @param {string} customerName - Customer name
 * @param {string} orderId - Order ID
 * @param {string} priority - Order priority (HIGH, MEDIUM, LOW)
 * @param {Array} items - Order items array with itemName, qty, itemId
 * @returns {Promise}
 */
const sendOrderConfirmationEmail = async (
  email,
  customerName,
  orderId,
  priority,
  items,
) => {
  const template = templates.orderConfirmation;
  const subject = template.subject;
  const html = template.getBody(customerName, orderId, priority, items, email);

  return sendEmail(email, subject, html);
};

module.exports = {
  sendEmail,
  sendCustomerRegistrationEmail,
  sendOrderConfirmationEmail,
};
