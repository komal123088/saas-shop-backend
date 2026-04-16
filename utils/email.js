const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

const sendApprovalEmail = async (tenant, password) => {
  await transporter.sendMail({
    from: `"ShopSaaS" <${process.env.EMAIL_USER}>`,
    to: tenant.email,
    subject: "🎉 Your Shop is Ready — Login Details",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #6c63ff;">Welcome to ShopSaaS! 🚀</h2>
        <p>Hello <strong>${tenant.ownerName}</strong>,</p>
        <p>Your shop has been approved!</p>
        
        <div style="background: #f5f5f5; padding: 20px; border-radius: 10px; margin: 20px 0;">
          <h3>Your Login Details</h3>
          <p><b>Shop Name:</b> ${tenant.shopName}</p>
          <p><b>Email:</b> ${tenant.email}</p>
          <p><b>Password:</b> <code style="background:#fff;padding:3px 8px;border-radius:4px;">${password}</code></p>
          <p><b>Tenant ID:</b> <code style="background:#fff;padding:3px 8px;border-radius:4px;">${tenant.tenantId}</code></p>
        </div>

        <a href="${process.env.SHOP_BASE_URL}/login" 
           style="background:#6c63ff;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;">
          Login to Your Shop →
        </a>

        <p style="margin-top:20px;color:#888;font-size:13px;">
          Login karte waqt Tenant ID zaroor daalna — ye tumhari shop ki unique ID hai.
        </p>
      </div>
    `,
  });
};

const sendRegistrationReceived = async (email, ownerName) => {
  await transporter.sendMail({
    from: `"ShopSaaS" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "✅ Registration Received — We will review shortly",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 32px; border-radius: 12px;">
        <h2 style="color: #6c63ff;">Thank you, ${ownerName}!</h2>
        <p>We have received your registration request.</p>
        <p>Our team will review and approve your account within <strong>24 hours</strong>.</p>
        <p>You will receive another email with your login details once approved.</p>
        <p style="color:#888;font-size:13px;margin-top:24px;">— ShopSaaS Team</p>
      </div>
    `,
  });
};

module.exports = { sendApprovalEmail, sendRegistrationReceived };
