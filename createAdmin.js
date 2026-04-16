const mongoose = require("mongoose");
const SuperAdmin = require("./models/SuperAdmin");
require("dotenv").config();

const create = async () => {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log("Connected!");

    const existing = await SuperAdmin.findOne({});
    if (existing) {
      console.log("❌ Admin already exists:", existing.email);
      process.exit(0);
    }

    await SuperAdmin.create({
      name: "komal",
      email: "komalraza401@gmail.com",
      password: "Komal123",
    });

    console.log("✅ Super Admin created!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
};

create();
