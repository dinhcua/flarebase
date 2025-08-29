#!/usr/bin/env node

/**
 * Setup Admin User Script
 *
 * This script helps set up the initial admin user for flarebase.
 * Run this after deploying your worker for the first time.
 */

const https = require("https");

// Configuration
const WORKER_URL =
  process.env.FLAREBASE_URL || "https://flarebase.kuquaysut.workers.dev";

async function setupAdmin() {
  console.log("🚀 Setting up flarebase admin user...");
  console.log(`🌐 Worker URL: ${WORKER_URL}`);

  const data = JSON.stringify({});

  const options = {
    hostname: new URL(WORKER_URL).hostname,
    port: 443,
    path: "/api/auth/init-admin",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": data.length,
    },
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let responseData = "";

      res.on("data", (chunk) => {
        responseData += chunk;
      });

      res.on("end", () => {
        try {
          const result = JSON.parse(responseData);

          if (res.statusCode === 200) {
            console.log("✅ Admin user created successfully!");
            console.log(`📧 Email: ${result.email}`);
            console.log(
              "🔑 Password: Check your wrangler.toml ADMIN_PASSWORD variable"
            );
            console.log("\n🎯 You can now login to the admin dashboard!");
          } else if (
            res.statusCode === 400 &&
            result.message.includes("already exists")
          ) {
            console.log("ℹ️  Admin user already exists.");
            console.log(
              "📧 Use the email and password from your wrangler.toml configuration"
            );
          } else {
            console.error("❌ Error:", result.error || result.message);
          }

          resolve(result);
        } catch (error) {
          console.error("❌ Failed to parse response:", responseData);
          reject(error);
        }
      });
    });

    req.on("error", (error) => {
      console.error("❌ Request failed:", error.message);
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

// Run the setup
if (require.main === module) {
  setupAdmin().catch((error) => {
    console.error("❌ Setup failed:", error);
    process.exit(1);
  });
}

module.exports = { setupAdmin };
