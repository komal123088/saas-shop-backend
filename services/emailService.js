const nodemailer = require("nodemailer");

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Email templates
const emailTemplates = {
  "low-stock": (data) => ({
    subject: `⚠️ Low Stock Alert - ${data.productName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ff9800;">Low Stock Alert</h2>
        <p>Product <strong>${data.productName}</strong> is running low on stock.</p>
        <p><strong>Current Stock:</strong> ${data.currentStock}</p>
        <p><strong>Minimum Required:</strong> ${data.minStock}</p>
        <p style="color: #d32f2f;">Please restock soon!</p>
      </div>
    `,
  }),

  "new-credit": (data) => ({
    subject: `💳 New Credit Customer - ${data.customerName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2196f3;">New Credit Customer Added</h2>
        <p><strong>Customer:</strong> ${data.customerName}</p>
        <p><strong>Phone:</strong> ${data.phone || "N/A"}</p>
        <p><strong>Credit Limit:</strong> RS ${data.creditLimit || 0}</p>
        <p><strong>Added By:</strong> ${data.addedBy || "System"}</p>
      </div>
    `,
  }),

  "employee-added": (data) => ({
    subject: `👤 New Employee Added - ${data.employeeName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4caf50;">New Employee Added</h2>
        <p><strong>Name:</strong> ${data.employeeName}</p>
        <p><strong>Role:</strong> ${data.role}</p>
        <p><strong>Username:</strong> ${data.username}</p>
        <p><strong>Salary:</strong> RS ${data.salary}</p>
        <p><strong>Join Date:</strong> ${data.joinDate || "Today"}</p>
      </div>
    `,
  }),

  "salary-paid": (data) => ({
    subject: `💰 Salary Paid - ${data.employeeName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4caf50;">Salary Payment Processed</h2>
        <p><strong>Employee:</strong> ${data.employeeName}</p>
        <p><strong>Amount:</strong> RS ${data.amount}</p>
        <p><strong>Month:</strong> ${data.month}</p>
        <p><strong>Paid By:</strong> ${data.paidBy || "Owner"}</p>
        <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
      </div>
    `,
  }),

  "credit-due": (data) => ({
    subject: `⏰ Credit Payment Due - ${data.customerName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ff5722;">Credit Payment Due Soon</h2>
        <p><strong>Customer:</strong> ${data.customerName}</p>
        <p><strong>Amount Due:</strong> RS ${data.amountDue}</p>
        <p><strong>Due Date:</strong> ${data.dueDate}</p>
        <p style="color: #d32f2f;">Please follow up for payment.</p>
      </div>
    `,
  }),
};

// Send email function
const sendEmail = async (to, templateType, data) => {
  try {
    if (!to) {
      console.log("❌ No email address provided");
      return { success: false, message: "No email address" };
    }

    const template = emailTemplates[templateType];
    if (!template) {
      console.log(`❌ Unknown template: ${templateType}`);
      return { success: false, message: "Unknown template" };
    }

    const { subject, html } = template(data);

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: to,
      subject: subject,
      html: html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${to}: ${info.messageId}`);

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Email error:", error);
    return { success: false, error: error.message };
  }
};

module.exports = { sendEmail };
