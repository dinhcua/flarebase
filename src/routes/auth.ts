import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { jwt, sign, verify } from "hono/jwt";
import { Bindings, User, AuthResponse } from "../types";

const authRouter = new Hono<{ Bindings: Bindings }>();

// Login schema validation
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

// Register schema validation
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().optional(),
});

// Simple password hashing for demo (use bcrypt in production)
const hashPassword = async (password: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
};

const verifyPassword = async (
  password: string,
  hash: string
): Promise<boolean> => {
  const hashedInput = await hashPassword(password);
  return hashedInput === hash;
};

// Login endpoint
authRouter.post("/login", zValidator("json", loginSchema), async (c) => {
  const { email, password } = c.req.valid("json");

  try {
    // Find user by email
    const user = (await c.env.flarebase
      .prepare("SELECT * FROM system_users WHERE email = ?")
      .bind(email)
      .first()) as User | null;

    if (!user) {
      return c.json({ error: "User not found" }, 401);
    }

    // Compare password
    const passwordMatch = await verifyPassword(password, user.password);
    if (!passwordMatch) {
      return c.json({ error: "Invalid credentials" }, 401);
    }

    // Generate JWT token
    const token = await sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      c.env.JWT_SECRET
    );

    // Return user info and token (excluding password)
    const { password: _, ...userWithoutPassword } = user;
    return c.json({
      user: userWithoutPassword,
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    return c.json({ error: "Authentication failed" }, 500);
  }
});

// Register endpoint
authRouter.post("/register", zValidator("json", registerSchema), async (c) => {
  const data = c.req.valid("json");
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  try {
    // Check if email already exists
    const existingUser = await c.env.flarebase
      .prepare("SELECT id FROM system_users WHERE email = ?")
      .bind(data.email)
      .first();

    if (existingUser) {
      return c.json({ error: "Email already in use" }, 409);
    }

    // Hash password
    const hashedPassword = await hashPassword(data.password);

    // Create user
    await c.env.flarebase
      .prepare(
        `INSERT INTO system_users (id, email, password, name, role, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        id,
        data.email,
        hashedPassword,
        data.name || null,
        "user", // Default role
        now,
        now
      )
      .run();

    // Generate JWT token
    const token = await sign(
      {
        id,
        email: data.email,
        role: "user",
      },
      c.env.JWT_SECRET
    );

    return c.json(
      {
        user: {
          id,
          email: data.email,
          name: data.name,
          role: "user",
          created_at: now,
          updated_at: now,
        },
        token,
      },
      201
    );
  } catch (error) {
    console.error("Registration error:", error);
    return c.json({ error: "Registration failed" }, 500);
  }
});

// Get current user endpoint
authRouter.get("/me", async (c) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const token = authHeader.substring(7);
    const payload = await verify(token, c.env.JWT_SECRET);

    const user = (await c.env.flarebase
      .prepare(
        "SELECT id, email, name, role, created_at, updated_at FROM system_users WHERE id = ?"
      )
      .bind(payload.id)
      .first()) as User | null;

    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    return c.json({ user });
  } catch (error) {
    console.error("Get user error:", error);
    return c.json({ error: "Invalid token" }, 401);
  }
});

// Initialize admin user endpoint (for first-time setup)
authRouter.post("/init-admin", async (c) => {
  try {
    // Check if any admin user already exists
    const existingAdmin = await c.env.flarebase
      .prepare("SELECT id FROM system_users WHERE role = 'admin' LIMIT 1")
      .first();

    if (existingAdmin) {
      return c.json(
        {
          message: "Admin user already exists",
          success: false,
        },
        400
      );
    }

    // Get admin credentials from environment
    const adminEmail = c.env.ADMIN_EMAIL || "admin@flarebase.dev";
    const adminPassword = c.env.ADMIN_PASSWORD || "admin123456";

    // Hash the admin password
    const hashedPassword = await hashPassword(adminPassword);
    const adminId = crypto.randomUUID();

    // Create admin user
    await c.env.flarebase
      .prepare(
        `INSERT INTO system_users (id, email, password, name, role, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        adminId,
        adminEmail,
        hashedPassword,
        "Administrator",
        "admin",
        new Date().toISOString(),
        new Date().toISOString()
      )
      .run();

    return c.json({
      message: "Admin user created successfully",
      email: adminEmail,
      success: true,
    });
  } catch (error) {
    console.error("Admin initialization error:", error);
    return c.json({ error: "Failed to initialize admin user" }, 500);
  }
});

// Auto-initialize admin user function
export const initializeAdminUser = async (env: Bindings): Promise<void> => {
  try {
    // Check if any admin user already exists
    const existingAdmin = await env.flarebase
      .prepare("SELECT id FROM system_users WHERE role = 'admin' LIMIT 1")
      .first();

    if (existingAdmin) {
      console.log("Admin user already exists");
      return;
    }

    // Get admin credentials from environment
    const adminEmail = env.ADMIN_EMAIL || "admin@flarebase.dev";
    const adminPassword = env.ADMIN_PASSWORD || "admin123456";

    // Hash the admin password
    const hashedPassword = await hashPassword(adminPassword);
    const adminId = crypto.randomUUID();

    // Create admin user
    await env.flarebase
      .prepare(
        `INSERT INTO system_users (id, email, password, name, role, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        adminId,
        adminEmail,
        hashedPassword,
        "Administrator",
        "admin",
        new Date().toISOString(),
        new Date().toISOString()
      )
      .run();

    console.log(`Admin user created: ${adminEmail}`);
  } catch (error) {
    console.error("Auto admin initialization error:", error);
  }
};

// Logout endpoint (for completeness, though JWT is stateless)
authRouter.post("/logout", (c) => {
  return c.json({ message: "Logged out successfully" });
});

export { authRouter };
