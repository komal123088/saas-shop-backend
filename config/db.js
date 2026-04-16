const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const MONGO_URI = process.env.MONGO_URI;

    console.log("🔄 Connecting to MongoDB...");
    console.log("MONGO_URI value:", MONGO_URI ? "✅ Found" : "❌ Undefined");

    if (!MONGO_URI) {
      console.error("❌ MONGO_URI is undefined.");
      return;
    }

    const conn = await mongoose.connect(MONGO_URI);
    console.log("✅ MongoDB Connected Successfully");
    console.log(`   Host: ${conn.connection.host}`);
    console.log(`   Database: ${conn.connection.name}`);

    mongoose.connection.on("disconnected", () => {
      console.warn("⚠ MongoDB Disconnected");
    });

    return conn;
  } catch (error) {
    console.error("❌ MongoDB Connection Failed!");
    console.error("   Error Message:", error.message);
  }
};

module.exports = connectDB;
