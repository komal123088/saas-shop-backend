const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../env");

const superAdminAuth = (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) return res.status(401).json({ message: "No token provided" });

    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.role !== "superadmin") {
      return res
        .status(403)
        .json({ message: "Access denied. Super admin only." });
    }

    req.adminId = decoded.id;
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid or expired token" });
  }
};

module.exports = superAdminAuth;
