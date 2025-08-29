import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { Bindings, Collection, QueryOptions, ListResponse } from "../types";
import { nanoid } from "nanoid";

const collectionsRouter = new Hono<{ Bindings: Bindings }>();

// Collection schema validation
const collectionSchema = z.object({
  name: z.string().min(1).max(50),
  schema: z.string(), // JSON schema as string
});

const recordSchema = z.record(z.any()); // Dynamic schema for records

// Helper function to build dynamic SQL from filters
const buildWhereClause = (filter?: string) => {
  if (!filter) return { clause: "", params: [] };

  // Simple filter parsing: "field=value,field2=value2"
  const conditions = filter
    .split(",")
    .map((f) => {
      const [field, value] = f.split("=");
      return { field: field?.trim(), value: value?.trim() };
    })
    .filter((c) => c.field && c.value);

  if (conditions.length === 0) return { clause: "", params: [] };

  const clause =
    "WHERE " + conditions.map(() => `${conditions[0].field} = ?`).join(" AND ");
  const params = conditions.map((c) => c.value);

  return { clause, params };
};

// Get all collections
collectionsRouter.get("/", async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      "SELECT * FROM collections ORDER BY created_at DESC"
    ).all();
    return c.json({ items: results });
  } catch (error) {
    console.error("Failed to get collections:", error);
    return c.json({ error: "Failed to get collections" }, 500);
  }
});

// Create new collection
collectionsRouter.post("/", zValidator("json", collectionSchema), async (c) => {
  try {
    const data = c.req.valid("json");
    const id = nanoid();
    const now = new Date().toISOString();

    // Check if collection name already exists
    const existing = await c.env.DB.prepare(
      "SELECT id FROM collections WHERE name = ?"
    )
      .bind(data.name)
      .first();

    if (existing) {
      return c.json({ error: "Collection name already exists" }, 409);
    }

    // Create collection
    await c.env.DB.prepare(
      "INSERT INTO collections (id, name, schema, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
    )
      .bind(id, data.name, data.schema, now, now)
      .run();

    // Create the actual table for this collection
    try {
      // Parse schema and create table
      const schema = JSON.parse(data.schema);
      let createTableSQL = `CREATE TABLE IF NOT EXISTS ${data.name} (
        id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL`;

      // Add fields from schema
      if (schema.properties) {
        for (const [fieldName, fieldDef] of Object.entries(schema.properties)) {
          const def = fieldDef as any;
          let sqlType = "TEXT";

          switch (def.type) {
            case "integer":
            case "number":
              sqlType = "INTEGER";
              break;
            case "boolean":
              sqlType = "INTEGER"; // SQLite uses INTEGER for boolean
              break;
            default:
              sqlType = "TEXT";
          }

          createTableSQL += `,\n        ${fieldName} ${sqlType}`;
        }
      }

      createTableSQL += "\n      )";

      await c.env.DB.prepare(createTableSQL).run();
    } catch (error) {
      console.error("Failed to create collection table:", error);
      // Rollback collection creation
      await c.env.DB.prepare("DELETE FROM collections WHERE id = ?")
        .bind(id)
        .run();
      return c.json({ error: "Invalid schema format" }, 400);
    }

    const collection = (await c.env.DB.prepare(
      "SELECT * FROM collections WHERE id = ?"
    )
      .bind(id)
      .first()) as Collection;

    return c.json(collection, 201);
  } catch (error) {
    console.error("Failed to create collection:", error);
    return c.json({ error: "Failed to create collection" }, 500);
  }
});

// Get specific collection
collectionsRouter.get("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const collection = (await c.env.DB.prepare(
      "SELECT * FROM collections WHERE id = ?"
    )
      .bind(id)
      .first()) as Collection | null;

    if (!collection) {
      return c.json({ error: "Collection not found" }, 404);
    }

    return c.json(collection);
  } catch (error) {
    console.error("Failed to get collection:", error);
    return c.json({ error: "Failed to get collection" }, 500);
  }
});

// Update collection
collectionsRouter.put(
  "/:id",
  zValidator("json", collectionSchema),
  async (c) => {
    try {
      const id = c.req.param("id");
      const data = c.req.valid("json");
      const now = new Date().toISOString();

      const existing = (await c.env.DB.prepare(
        "SELECT * FROM collections WHERE id = ?"
      )
        .bind(id)
        .first()) as Collection | null;

      if (!existing) {
        return c.json({ error: "Collection not found" }, 404);
      }

      await c.env.DB.prepare(
        "UPDATE collections SET name = ?, schema = ?, updated_at = ? WHERE id = ?"
      )
        .bind(data.name, data.schema, now, id)
        .run();

      const updated = (await c.env.DB.prepare(
        "SELECT * FROM collections WHERE id = ?"
      )
        .bind(id)
        .first()) as Collection;

      return c.json(updated);
    } catch (error) {
      console.error("Failed to update collection:", error);
      return c.json({ error: "Failed to update collection" }, 500);
    }
  }
);

// Delete collection
collectionsRouter.delete("/:id", async (c) => {
  try {
    const id = c.req.param("id");

    const collection = (await c.env.DB.prepare(
      "SELECT * FROM collections WHERE id = ?"
    )
      .bind(id)
      .first()) as Collection | null;

    if (!collection) {
      return c.json({ error: "Collection not found" }, 404);
    }

    // Drop the actual table
    await c.env.DB.prepare(`DROP TABLE IF EXISTS ${collection.name}`).run();

    // Delete collection metadata
    await c.env.DB.prepare("DELETE FROM collections WHERE id = ?")
      .bind(id)
      .run();

    return c.text("", 204);
  } catch (error) {
    console.error("Failed to delete collection:", error);
    return c.json({ error: "Failed to delete collection" }, 500);
  }
});

// Get records from collection
collectionsRouter.get("/:collection/records", async (c) => {
  try {
    const collectionName = c.req.param("collection");
    const page = parseInt(c.req.query("page") || "1");
    const perPage = Math.min(parseInt(c.req.query("perPage") || "20"), 100);
    const sort = c.req.query("sort") || "-created_at";
    const filter = c.req.query("filter");

    // Verify collection exists
    const collection = await c.env.DB.prepare(
      "SELECT * FROM collections WHERE name = ?"
    )
      .bind(collectionName)
      .first();

    if (!collection) {
      return c.json({ error: "Collection not found" }, 404);
    }

    // Build query
    const { clause: whereClause, params: whereParams } =
      buildWhereClause(filter);
    const offset = (page - 1) * perPage;

    // Parse sort (e.g., "-created_at" for DESC, "name" for ASC)
    const sortDesc = sort.startsWith("-");
    const sortField = sortDesc ? sort.substring(1) : sort;
    const sortOrder = sortDesc ? "DESC" : "ASC";

    // Get total count
    const countQuery = `SELECT COUNT(*) as count FROM ${collectionName} ${whereClause}`;
    const countResult = (await c.env.DB.prepare(countQuery)
      .bind(...whereParams)
      .first()) as { count: number };
    const total = countResult.count;

    // Get records
    const query = `SELECT * FROM ${collectionName} ${whereClause} ORDER BY ${sortField} ${sortOrder} LIMIT ? OFFSET ?`;
    const { results } = await c.env.DB.prepare(query)
      .bind(...whereParams, perPage, offset)
      .all();

    const response: ListResponse<any> = {
      items: results,
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage),
    };

    return c.json(response);
  } catch (error) {
    console.error("Failed to get records:", error);
    return c.json({ error: "Failed to get records" }, 500);
  }
});

// Create record in collection
collectionsRouter.post(
  "/:collection/records",
  zValidator("json", recordSchema),
  async (c) => {
    try {
      const collectionName = c.req.param("collection");
      const data = c.req.valid("json");

      // Verify collection exists
      const collection = await c.env.DB.prepare(
        "SELECT * FROM collections WHERE name = ?"
      )
        .bind(collectionName)
        .first();

      if (!collection) {
        return c.json({ error: "Collection not found" }, 404);
      }

      const id = nanoid();
      const now = new Date().toISOString();

      // Build INSERT query
      const fields = ["id", "created_at", "updated_at", ...Object.keys(data)];
      const values = [id, now, now, ...Object.values(data)];
      const placeholders = fields.map(() => "?").join(", ");

      const query = `INSERT INTO ${collectionName} (${fields.join(
        ", "
      )}) VALUES (${placeholders})`;
      await c.env.DB.prepare(query)
        .bind(...values)
        .run();

      // Get the created record
      const record = await c.env.DB.prepare(
        `SELECT * FROM ${collectionName} WHERE id = ?`
      )
        .bind(id)
        .first();

      return c.json(record, 201);
    } catch (error) {
      console.error("Failed to create record:", error);
      return c.json({ error: "Failed to create record" }, 500);
    }
  }
);

// Get specific record
collectionsRouter.get("/:collection/records/:id", async (c) => {
  try {
    const collectionName = c.req.param("collection");
    const id = c.req.param("id");

    // Verify collection exists
    const collection = await c.env.DB.prepare(
      "SELECT * FROM collections WHERE name = ?"
    )
      .bind(collectionName)
      .first();

    if (!collection) {
      return c.json({ error: "Collection not found" }, 404);
    }

    const record = await c.env.DB.prepare(
      `SELECT * FROM ${collectionName} WHERE id = ?`
    )
      .bind(id)
      .first();

    if (!record) {
      return c.json({ error: "Record not found" }, 404);
    }

    return c.json(record);
  } catch (error) {
    console.error("Failed to get record:", error);
    return c.json({ error: "Failed to get record" }, 500);
  }
});

// Update record
collectionsRouter.put(
  "/:collection/records/:id",
  zValidator("json", recordSchema),
  async (c) => {
    try {
      const collectionName = c.req.param("collection");
      const id = c.req.param("id");
      const data = c.req.valid("json");

      // Verify collection exists
      const collection = await c.env.DB.prepare(
        "SELECT * FROM collections WHERE name = ?"
      )
        .bind(collectionName)
        .first();

      if (!collection) {
        return c.json({ error: "Collection not found" }, 404);
      }

      // Check if record exists
      const existing = await c.env.DB.prepare(
        `SELECT * FROM ${collectionName} WHERE id = ?`
      )
        .bind(id)
        .first();

      if (!existing) {
        return c.json({ error: "Record not found" }, 404);
      }

      const now = new Date().toISOString();

      // Build UPDATE query
      const fields = Object.keys(data);
      const values = Object.values(data);
      const setClause = fields.map((field) => `${field} = ?`).join(", ");

      const query = `UPDATE ${collectionName} SET ${setClause}, updated_at = ? WHERE id = ?`;
      await c.env.DB.prepare(query)
        .bind(...values, now, id)
        .run();

      // Get updated record
      const record = await c.env.DB.prepare(
        `SELECT * FROM ${collectionName} WHERE id = ?`
      )
        .bind(id)
        .first();

      return c.json(record);
    } catch (error) {
      console.error("Failed to update record:", error);
      return c.json({ error: "Failed to update record" }, 500);
    }
  }
);

// Delete record
collectionsRouter.delete("/:collection/records/:id", async (c) => {
  try {
    const collectionName = c.req.param("collection");
    const id = c.req.param("id");

    // Verify collection exists
    const collection = await c.env.DB.prepare(
      "SELECT * FROM collections WHERE name = ?"
    )
      .bind(collectionName)
      .first();

    if (!collection) {
      return c.json({ error: "Collection not found" }, 404);
    }

    // Check if record exists
    const existing = await c.env.DB.prepare(
      `SELECT * FROM ${collectionName} WHERE id = ?`
    )
      .bind(id)
      .first();

    if (!existing) {
      return c.json({ error: "Record not found" }, 404);
    }

    await c.env.DB.prepare(`DELETE FROM ${collectionName} WHERE id = ?`)
      .bind(id)
      .run();

    return c.text("", 204);
  } catch (error) {
    console.error("Failed to delete record:", error);
    return c.json({ error: "Failed to delete record" }, 500);
  }
});

export { collectionsRouter };
