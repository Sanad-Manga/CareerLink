const mongoose = require("mongoose");
const dns = require("dns");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const User = require("./models/User");

dns.setServers(["8.8.8.8", "1.1.1.1"]);

const force = process.argv.includes("--force");

const fail = (message) => {
  console.error(`Seed aborted: ${message}`);
  process.exit(1);
};

const createAdminUser = async () => {
  if (!process.env.MONGO_URI) {
    fail("MONGO_URI is not defined.");
  }

  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!email || !password) {
    fail(
      "SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must both be set. " +
        "See .env.example."
    );
  }

  if (password.length < 8) {
    fail("SEED_ADMIN_PASSWORD must be at least 8 characters.");
  }

  if (process.env.NODE_ENV === "production" && !force) {
    fail(
      "Refusing to seed with NODE_ENV=production. Re-run with --force if you " +
        "really mean to touch the production database."
    );
  }

  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log("MongoDB connected.");

    const existing = await User.findOne({ email });

    if (existing) {
      console.log(
        `Admin "${email}" already exists — leaving it untouched. ` +
          "Delete the account manually if you need to re-seed it."
      );
      return;
    }

    // pre-save hook on the User model hashes the password
    await User.create({
      name: "Admin User",
      email,
      password,
      role: "admin",
      status: "approved",
    });
    console.log(`Admin user "${email}" created successfully.`);
  } catch (error) {
    console.error("Error creating admin user:", error);
    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      console.log("MongoDB connection closed.");
    }
  }
};

createAdminUser();
