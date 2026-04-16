const jwt = require("jsonwebtoken");
const Owner = require("../models/Owner");
const { JWT_SECRET } = require("../env");

const tenantAuth = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return res
        .status(401)
        .json({ message: "No token, authorization denied" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    if (!decoded.tenantId) {
      return res
        .status(403)
        .json({ message: "Invalid token — tenantId missing" });
    }

    if (decoded.isOwner) {
      const owner = await Owner.findById(decoded.id);
      if (!owner) return res.status(401).json({ message: "User not found" });
      if (decoded.tokenVersion !== owner.tokenVersion) {
        return res
          .status(401)
          .json({
            message: "Session expired. Please login again.",
            sessionExpired: true,
          });
      }
    }

    req.tenantId = decoded.tenantId;
    req.userId = decoded.id;
    req.userRole = decoded.role;
    req.isOwner = decoded.isOwner || false;
    req.user = decoded;

    next();
  } catch (err) {
    return res
      .status(401)
      .json({ message: "Token is invalid or expired", tokenInvalid: true });
  }
};

const isOwner = (req, res, next) => {
  if (!req.isOwner)
    return res.status(403).json({ message: "Access denied. Owner only." });
  next();
};

const isOwnerOrManager = (req, res, next) => {
  if (!req.isOwner && req.userRole !== "manager") {
    return res
      .status(403)
      .json({ message: "Access denied. Owner or Manager only." });
  }
  next();
};

const hasRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (req.isOwner) return next();
    if (!allowedRoles.includes(req.userRole)) {
      return res
        .status(403)
        .json({
          message: `Access denied. Required: ${allowedRoles.join(" or ")}`,
        });
    }
    next();
  };
};

module.exports = { tenantAuth, isOwnerOrManager, isOwner, hasRole };
