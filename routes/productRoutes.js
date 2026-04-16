const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Product = require("../models/Product");
const { tenantAuth, isOwnerOrManager } = require("../middleware/tenantAuth");

// Uploads folder
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() +
      "-" +
      Math.round(Math.random() * 1e9) +
      path.extname(file.originalname);
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif|webp/;
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase(),
    );
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) return cb(null, true);
    cb(new Error("Only image files are allowed!"));
  },
});

router.use(tenantAuth);

// GET all products
router.get("/", async (req, res) => {
  try {
    const products = await Product.find({ tenantId: req.tenantId })
      .populate("category", "name isActive")
      .populate("location", "name isActive")
      .sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET single product
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      tenantId: req.tenantId,
    })
      .populate("category", "name isActive")
      .populate("location", "name isActive");

    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST create product
router.post("/", isOwnerOrManager, upload.single("image"), async (req, res) => {
  try {
    const productData = { ...req.body };

    productData.tenantId = req.tenantId;
    productData.stock = Number(productData.stock) || 0;
    productData.costPrice = Number(productData.costPrice) || 0;
    productData.salePrice = Number(productData.salePrice) || 0;
    productData.minStockAlert = Number(productData.minStockAlert) || 10;

    if (!productData.category || productData.category === "")
      delete productData.category;
    if (!productData.location || productData.location === "")
      delete productData.location;
    if (!productData.supplier || productData.supplier === "")
      productData.supplier = "";

    // image: sirf string accept karo
    if (req.file) {
      productData.image = `/uploads/${req.file.filename}`;
    } else {
      delete productData.image;
    }

    const product = new Product(productData);
    const newProduct = await product.save();

    const populated = await Product.findById(newProduct._id)
      .populate("category", "name isActive")
      .populate("location", "name isActive");

    res.status(201).json(populated);
  } catch (err) {
    console.error("Error creating product:", err);
    if (err.name === "ValidationError") {
      return res.status(400).json({
        message: "Validation error",
        errors: Object.values(err.errors).map((e) => e.message),
      });
    }
    if (err.code === 11000) {
      return res.status(400).json({ message: "Duplicate SKU or barcode" });
    }
    res.status(400).json({ message: err.message });
  }
});

// PUT update product
router.put(
  "/:id",
  isOwnerOrManager,
  upload.single("image"),
  async (req, res) => {
    try {
      const updateData = { ...req.body };

      if (updateData.stock !== undefined)
        updateData.stock = Number(updateData.stock) || 0;
      if (updateData.costPrice !== undefined)
        updateData.costPrice = Number(updateData.costPrice) || 0;
      if (updateData.salePrice !== undefined)
        updateData.salePrice = Number(updateData.salePrice) || 0;
      if (updateData.minStockAlert !== undefined)
        updateData.minStockAlert = Number(updateData.minStockAlert) || 10;

      if (updateData.category === "") updateData.category = null;
      if (updateData.location === "") updateData.location = null;
      if (updateData.supplier === "") updateData.supplier = "";

      // image: req.file aya tu naya path, nahi aya tu field hi hata do
      if (req.file) {
        updateData.image = `/uploads/${req.file.filename}`;
      } else {
        delete updateData.image;
      }

      const updatedProduct = await Product.findOneAndUpdate(
        { _id: req.params.id, tenantId: req.tenantId },
        updateData,
        { new: true, runValidators: true },
      )
        .populate("category", "name isActive")
        .populate("location", "name isActive");

      if (!updatedProduct)
        return res.status(404).json({ message: "Product not found" });
      res.json(updatedProduct);
    } catch (err) {
      console.error("Error updating product:", err);
      res.status(400).json({ message: err.message });
    }
  },
);

// DELETE product
router.delete("/:id", isOwnerOrManager, async (req, res) => {
  try {
    const product = await Product.findOneAndDelete({
      _id: req.params.id,
      tenantId: req.tenantId,
    });

    if (!product) return res.status(404).json({ message: "Product not found" });

    if (product.image) {
      const imgPath = path.join(__dirname, "..", product.image);
      if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
    }

    res.json({ message: "Product deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// SEARCH products
router.get("/search/:query", async (req, res) => {
  try {
    const searchQuery = req.params.query;
    const products = await Product.find({
      tenantId: req.tenantId,
      $or: [
        { name: { $regex: searchQuery, $options: "i" } },
        { sku: { $regex: searchQuery, $options: "i" } },
        { barcode: { $regex: searchQuery, $options: "i" } },
      ],
    })
      .populate("category", "name")
      .populate("location", "name")
      .limit(20);

    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
