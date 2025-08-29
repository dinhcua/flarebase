import { Hono } from "hono";
import { Bindings } from "../types";

const backupRouter = new Hono<{ Bindings: Bindings }>();

// Export data
backupRouter.get("/export", async (c) => {
  try {
    const format = c.req.query("format") || "json";
    const collection = c.req.query("collection");

    let data: any = {};

    if (collection) {
      // Export specific collection
      const collectionInfo = await c.env.DB.prepare(
        "SELECT * FROM collections WHERE name = ?"
      )
        .bind(collection)
        .first();

      if (!collectionInfo) {
        return c.json({ error: "Collection not found" }, 404);
      }

      const { results } = await c.env.DB.prepare(
        `SELECT * FROM ${collection}`
      ).all();
      data = {
        collection: collectionInfo,
        records: results,
      };
    } else {
      // Export all data
      const { results: collections } = await c.env.DB.prepare(
        "SELECT * FROM collections"
      ).all();
      data.collections = collections;
      data.records = {};

      // Export records from each collection
      for (const coll of collections as any[]) {
        const { results } = await c.env.DB.prepare(
          `SELECT * FROM ${coll.name}`
        ).all();
        data.records[coll.name] = results;
      }

      // Export system tables
      const { results: users } = await c.env.DB.prepare(
        "SELECT id, email, name, role, created_at, updated_at FROM system_users"
      ).all();
      data.users = users;

      const { results: files } = await c.env.DB.prepare(
        "SELECT * FROM files"
      ).all();
      data.files = files;
    }

    data.exported_at = new Date().toISOString();
    data.version = "1.0.0";

    if (format === "json") {
      const headers = new Headers();
      headers.set("Content-Type", "application/json");
      headers.set(
        "Content-Disposition",
        `attachment; filename="flarebase-backup-${
          new Date().toISOString().split("T")[0]
        }.json"`
      );

      return new Response(JSON.stringify(data, null, 2), { headers });
    }

    return c.json({ error: "Unsupported format" }, 400);
  } catch (error) {
    console.error("Failed to export data:", error);
    return c.json({ error: "Failed to export data" }, 500);
  }
});

// Import data
backupRouter.post("/import", async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return c.json({ error: "No backup file provided" }, 400);
    }

    const content = await file.text();
    let data: any;

    try {
      data = JSON.parse(content);
    } catch (error) {
      return c.json({ error: "Invalid JSON format" }, 400);
    }

    // Validate backup structure
    if (!data.version || !data.exported_at) {
      return c.json({ error: "Invalid backup file format" }, 400);
    }

    const overwrite = c.req.query("overwrite") === "true";

    // Import collections first
    if (data.collections) {
      for (const collection of data.collections) {
        const existing = await c.env.DB.prepare(
          "SELECT id FROM collections WHERE name = ?"
        )
          .bind(collection.name)
          .first();

        if (existing && !overwrite) {
          continue; // Skip if exists and not overwriting
        }

        if (existing && overwrite) {
          // Delete existing collection
          await c.env.DB.prepare(
            `DROP TABLE IF EXISTS ${collection.name}`
          ).run();
          await c.env.DB.prepare("DELETE FROM collections WHERE name = ?")
            .bind(collection.name)
            .run();
        }

        // Create collection
        await c.env.DB.prepare(
          "INSERT OR REPLACE INTO collections (id, name, schema, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
        )
          .bind(
            collection.id,
            collection.name,
            collection.schema,
            collection.created_at,
            collection.updated_at
          )
          .run();

        // Create table
        try {
          const schema = JSON.parse(collection.schema);
          let createTableSQL = `CREATE TABLE IF NOT EXISTS ${collection.name} (
            id TEXT PRIMARY KEY,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL`;

          if (schema.properties) {
            for (const [fieldName, fieldDef] of Object.entries(
              schema.properties
            )) {
              const def = fieldDef as any;
              let sqlType = "TEXT";

              switch (def.type) {
                case "integer":
                case "number":
                  sqlType = "INTEGER";
                  break;
                case "boolean":
                  sqlType = "INTEGER";
                  break;
                default:
                  sqlType = "TEXT";
              }

              createTableSQL += `,\n            ${fieldName} ${sqlType}`;
            }
          }

          createTableSQL += "\n          )";
          await c.env.DB.prepare(createTableSQL).run();
        } catch (error) {
          console.error(
            "Failed to create table for collection:",
            collection.name,
            error
          );
        }
      }
    }

    // Import records
    if (data.records) {
      for (const [collectionName, records] of Object.entries(data.records)) {
        const recordList = records as any[];

        for (const record of recordList) {
          const fields = Object.keys(record);
          const values = Object.values(record);
          const placeholders = fields.map(() => "?").join(", ");

          try {
            const query = `INSERT OR REPLACE INTO ${collectionName} (${fields.join(
              ", "
            )}) VALUES (${placeholders})`;
            await c.env.DB.prepare(query)
              .bind(...values)
              .run();
          } catch (error) {
            console.error(
              `Failed to import record to ${collectionName}:`,
              error
            );
          }
        }
      }
    }

    // Import users
    if (data.users) {
      for (const user of data.users) {
        try {
          await c.env.DB.prepare(
            "INSERT OR REPLACE INTO system_users (id, email, password, name, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
          )
            .bind(
              user.id,
              user.email,
              user.password || "imported_user", // Default password for imported users
              user.name,
              user.role,
              user.created_at,
              user.updated_at
            )
            .run();
        } catch (error) {
          console.error("Failed to import user:", error);
        }
      }
    }

    return c.json({
      message: "Import completed successfully",
      imported_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to import data:", error);
    return c.json({ error: "Failed to import data" }, 500);
  }
});

export { backupRouter };
