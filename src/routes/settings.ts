import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { Bindings, SystemSettings } from "../types";

const settingsRouter = new Hono<{ Bindings: Bindings }>();

// Settings schema validation
const settingsSchema = z.record(z.any());

// Get system settings
settingsRouter.get("/", async (c) => {
  try {
    // Get settings from KV store
    const settingsData = await c.env.flarebase_KV.get("system_settings");

    const defaultSettings: SystemSettings = {
      app_name: "flarebase",
      app_version: "1.0.0",
      max_file_size: 10 * 1024 * 1024, // 10MB
      allowed_file_types: ["image/*", "application/pdf", "text/*"],
      auth_required: true,
      user_registration_enabled: true,
      max_collections: 50,
      max_records_per_collection: 10000,
      cache_ttl: 300, // 5 minutes
      rate_limit_requests: 100,
      rate_limit_window: 3600, // 1 hour
      backup_retention_days: 30,
      realtime_enabled: true,
      presence_enabled: true,
      analytics_enabled: true,
    };

    if (settingsData) {
      try {
        const settings = JSON.parse(settingsData);
        return c.json({ ...defaultSettings, ...settings });
      } catch (error) {
        console.error("Failed to parse settings:", error);
        return c.json(defaultSettings);
      }
    }

    return c.json(defaultSettings);
  } catch (error) {
    console.error("Failed to get settings:", error);
    return c.json({ error: "Failed to get settings" }, 500);
  }
});

// Update system settings
settingsRouter.put("/", zValidator("json", settingsSchema), async (c) => {
  try {
    const newSettings = c.req.valid("json");

    // Get current settings
    const currentSettingsData = await c.env.flarebase_KV.get("system_settings");
    let currentSettings = {};

    if (currentSettingsData) {
      try {
        currentSettings = JSON.parse(currentSettingsData);
      } catch (error) {
        console.error("Failed to parse current settings:", error);
      }
    }

    // Merge with new settings
    const updatedSettings = {
      ...currentSettings,
      ...newSettings,
      updated_at: new Date().toISOString(),
    };

    // Save to KV store
    await c.env.flarebase_KV.put(
      "system_settings",
      JSON.stringify(updatedSettings)
    );

    return c.json(updatedSettings);
  } catch (error) {
    console.error("Failed to update settings:", error);
    return c.json({ error: "Failed to update settings" }, 500);
  }
});

// Reset settings to default
settingsRouter.post("/reset", async (c) => {
  try {
    const defaultSettings: SystemSettings = {
      app_name: "flarebase",
      app_version: "1.0.0",
      max_file_size: 10 * 1024 * 1024, // 10MB
      allowed_file_types: ["image/*", "application/pdf", "text/*"],
      auth_required: true,
      user_registration_enabled: true,
      max_collections: 50,
      max_records_per_collection: 10000,
      cache_ttl: 300, // 5 minutes
      rate_limit_requests: 100,
      rate_limit_window: 3600, // 1 hour
      backup_retention_days: 30,
      realtime_enabled: true,
      presence_enabled: true,
      analytics_enabled: true,
      reset_at: new Date().toISOString(),
    };

    // Save default settings to KV
    await c.env.flarebase_KV.put(
      "system_settings",
      JSON.stringify(defaultSettings)
    );

    return c.json(defaultSettings);
  } catch (error) {
    console.error("Failed to reset settings:", error);
    return c.json({ error: "Failed to reset settings" }, 500);
  }
});

// Get specific setting
settingsRouter.get("/:key", async (c) => {
  try {
    const key = c.req.param("key");

    const settingsData = await c.env.flarebase_KV.get("system_settings");
    if (!settingsData) {
      return c.json({ error: "Settings not found" }, 404);
    }

    const settings = JSON.parse(settingsData);

    if (!(key in settings)) {
      return c.json({ error: "Setting key not found" }, 404);
    }

    return c.json({ [key]: settings[key] });
  } catch (error) {
    console.error("Failed to get setting:", error);
    return c.json({ error: "Failed to get setting" }, 500);
  }
});

// Update specific setting
settingsRouter.put("/:key", async (c) => {
  try {
    const key = c.req.param("key");
    const body = await c.req.json();
    const value = body.value;

    // Get current settings
    const settingsData = await c.env.flarebase_KV.get("system_settings");
    let settings = {};

    if (settingsData) {
      try {
        settings = JSON.parse(settingsData);
      } catch (error) {
        console.error("Failed to parse current settings:", error);
      }
    }

    // Update specific key
    const updatedSettings = {
      ...settings,
      [key]: value,
      updated_at: new Date().toISOString(),
    };

    // Save to KV store
    await c.env.flarebase_KV.put(
      "system_settings",
      JSON.stringify(updatedSettings)
    );

    return c.json({ [key]: value });
  } catch (error) {
    console.error("Failed to update setting:", error);
    return c.json({ error: "Failed to update setting" }, 500);
  }
});

export { settingsRouter };
