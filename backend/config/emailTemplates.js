// Email Template Configuration
// Contains all email subjects and HTML body templates with placeholders

const SLA_MAPPING = {
  HIGH: 3,
  MEDIUM: 7,
  LOW: 7,
};

const calculateDeliveryDate = (priority) => {
  const days = SLA_MAPPING[priority] || 7;
  const deliveryDate = new Date();
  deliveryDate.setDate(deliveryDate.getDate() + days);

  const options = { year: "numeric", month: "long", day: "numeric" };
  return {
    date: deliveryDate.toLocaleDateString("en-US", options),
    days: days,
    isExceeded: priority === "LOW",
  };
};

const getSLAText = (priority) => {
  const { date, days, isExceeded } = calculateDeliveryDate(priority);
  if (isExceeded) {
    return `You can collect your equipment by ${date} (within ${days}+ days)`;
  }
  return `You can collect your equipment by ${date} (within ${days} days)`;
};

const getPriorityBadgeColor = (priority) => {
  switch (priority) {
    case "HIGH":
      return "#d32f2f"; // Red
    case "MEDIUM":
      return "#f57c00"; // Orange
    case "LOW":
      return "#388e3c"; // Green
    default:
      return "#757575"; // Gray
  }
};

const generateItemsTableHTML = (items) => {
  return items
    .map(
      (item, index) => `
    <tr style="border-bottom: 1px solid #e0e0e0;">
      <td style="padding: 10px; border-right: 1px solid #e0e0e0;">${index + 1}</td>
      <td style="padding: 10px; border-right: 1px solid #e0e0e0;">${item.itemName || item.name || "N/A"}</td>
      <td style="padding: 10px; border-right: 1px solid #e0e0e0; text-align: center;">${item.qty || 1}</td>
      <td style="padding: 10px; text-align: center;">${item.itemId || "N/A"}</td>
    </tr>
  `,
    )
    .join("");
};

const templates = {
  // Customer Registration Email
  customerRegistration: {
    subject: "Welcome to Buildforge Warehouse System",
    getBody: (fullName, shopName, email) => `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
          .header h1 { margin: 0; font-size: 28px; }
          .header p { margin: 5px 0 0 0; font-size: 14px; opacity: 0.9; }
          .content { background: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-radius: 0 0 8px 8px; }
          .section { margin: 20px 0; }
          .section h2 { font-size: 18px; color: #667eea; margin-top: 0; }
          .info-box { background: white; padding: 15px; border-left: 4px solid #667eea; margin: 15px 0; }
          .info-box strong { color: #667eea; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
          .button { display: inline-block; background: #667eea; color: white; padding: 10px 20px; border-radius: 4px; text-decoration: none; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Buildforge</h1>
            <p>Warehouse Management System</p>
          </div>
          
          <div class="content">
            <p>Hello <strong>${fullName}</strong>,</p>
            
            <p>Thank you for registering with our warehouse management system! Your account has been successfully created.</p>
            
            <div class="info-box">
              <strong>Registration Details:</strong><br>
              Name: ${fullName}<br>
              Shop Name: ${shopName}<br>
              Email: ${email}
            </div>
            
            <div class="section">
              <h2>Getting Started</h2>
              <p>Your account is now active and ready to use. You can start creating orders and managing your equipment inventory immediately.</p>
              <ul>
                <li>Create orders for equipment</li>
                <li>Track order status in real-time</li>
                <li>Manage your inventory</li>
                <li>Access historical records</li>
              </ul>
            </div>
            
            <div class="section">
              <h2>Need Help?</h2>
              <p>If you have any questions or need assistance, please contact our support team. We're here to help!</p>
            </div>
            
            <div class="footer">
              <p>© 2024 Buildforge Warehouse System. All rights reserved.</p>
              <p>This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
  },

  // Order Confirmation Email
  orderConfirmation: {
    subject: "Order Confirmation - Buildforge Warehouse System",
    getBody: (customerName, orderId, priority, items, email) => {
      const deliveryInfo = calculateDeliveryDate(priority);
      const slaText = getSLAText(priority);
      const priorityColor = getPriorityBadgeColor(priority);
      const itemsHtml = generateItemsTableHTML(items);

      return `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 650px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
            .header h1 { margin: 0; font-size: 28px; }
            .header p { margin: 5px 0 0 0; font-size: 14px; opacity: 0.9; }
            .content { background: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-radius: 0 0 8px 8px; }
            .order-header { background: white; padding: 20px; border-radius: 6px; margin-bottom: 20px; border: 1px solid #e0e0e0; }
            .order-id { font-size: 14px; color: #666; margin: 5px 0; }
            .order-id strong { color: #333; }
            .priority-badge { display: inline-block; background: ${priorityColor}; color: white; padding: 6px 12px; border-radius: 4px; font-weight: bold; font-size: 12px; margin: 5px 0; }
            .section { margin: 20px 0; }
            .section h2 { font-size: 18px; color: #667eea; margin-top: 0; border-bottom: 2px solid #667eea; padding-bottom: 10px; }
            .info-box { background: white; padding: 15px; border-left: 4px solid #667eea; margin: 15px 0; }
            .info-box strong { color: #667eea; }
            .items-table { width: 100%; border-collapse: collapse; background: white; margin: 15px 0; }
            .items-table th { background: #f0f0f0; padding: 12px; text-align: left; border: 1px solid #ddd; font-weight: bold; color: #333; }
            .items-table td { padding: 12px; border: 1px solid #ddd; }
            .sla-notice { background: #e8f5e9; border-left: 4px solid #4caf50; padding: 15px; margin: 20px 0; border-radius: 4px; }
            .sla-notice strong { color: #2e7d32; }
            .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Order Confirmed</h1>
              <p>Your equipment order has been received</p>
            </div>
            
            <div class="content">
              <p>Hello <strong>${customerName}</strong>,</p>
              
              <p>Thank you for placing an order with Buildforge Warehouse System. Your order has been successfully received and is being processed.</p>
              
              <div class="order-header">
                <div class="order-id">Order ID: <strong>#${orderId}</strong></div>
                <div class="order-id">Order Date: <strong>${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</strong></div>
                <div class="order-id">Expected Delivery: <strong>${deliveryInfo.date}</strong></div>
                <div><span class="priority-badge">${priority} PRIORITY</span></div>
              </div>
              
              <div class="section">
                <h2>Order Details</h2>
                <table class="items-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Equipment Name</th>
                      <th>Quantity</th>
                      <th>Item ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${itemsHtml}
                  </tbody>
                </table>
              </div>
              
              <div class="sla-notice">                <strong>Order Status: PENDING APPROVAL</strong><br>
                Your order has been successfully submitted and is currently <strong>pending approval</strong> from our Sales Manager. We will review your requested quantities and proceed with the approval process. You will receive a confirmation email once your order is approved.
              </div>
              
              <div class=\"sla-notice\" style=\"background: #f0f9ff; border-left-color: #2196F3;\">                <strong>Service Level Agreement:</strong><br>
                ${slaText}
              </div>
              
              <div class="section">
                <h2>What Happens Next</h2>
                <ol>
                  <li>Your order will be reviewed and approved by the sales manager</li>
                  <li>Once approved, inventory will be reserved for your order</li>
                  <li>Items will be picked and prepared for dispatch</li>
                  <li>You will receive a dispatch notification with tracking details</li>
                  <li>Equipment will be delivered according to the SLA timeline</li>
                </ol>
              </div>
              
              <div class="info-box">
                <strong>Questions?</strong><br>
                If you have any questions about your order, please don't hesitate to contact us. We're here to help!<br>
                Email: support@buildforge.com<br>
                Phone: +1-800-WAREHOUSE (1-800-927-7462)
              </div>
              
              <div class="footer">
                <p>© 2024 Buildforge Warehouse System. All rights reserved.</p>
                <p>This is an automated message. Please do not reply to this email.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;
    },
  },
};

module.exports = {
  templates,
  SLA_MAPPING,
  calculateDeliveryDate,
  getSLAText,
  getPriorityBadgeColor,
  generateItemsTableHTML,
};
