import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { Bindings, FileRecord, ListResponse } from "../types";
import { nanoid } from "nanoid";

const storageRouter = new Hono<{ Bindings: Bindings }>();

// File metadata schema validation
const fileMetadataSchema = z.object({
  fileName: z.string().optional(),
  contentType: z.string().optional(),
  isPublic: z.boolean().optional().default(false),
  folder: z.string().optional().default(""),
});

// Get files list
storageRouter.get("/", async (c) => {
  try {
    const page = parseInt(c.req.query("page") || "1");
    const perPage = Math.min(parseInt(c.req.query("perPage") || "20"), 100);
    const prefix = c.req.query("prefix") || "";

    const offset = (page - 1) * perPage;

    // Build WHERE clause for prefix filtering
    let whereClause = "";
    let params: any[] = [];

    if (prefix) {
      whereClause = "WHERE path LIKE ?";
      params.push(`${prefix}%`);
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as count FROM files ${whereClause}`;
    const countResult = (await c.env.DB.prepare(countQuery)
      .bind(...params)
      .first()) as { count: number };
    const total = countResult.count;

    // Get files
    const query = `SELECT * FROM files ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    const { results } = await c.env.DB.prepare(query)
      .bind(...params, perPage, offset)
      .all();

    // Add public URLs for files
    const files = (results as FileRecord[]).map((file) => ({
      ...file,
      is_public: Boolean(file.is_public),
      url: file.is_public
        ? `/api/storage/${file.id}/public`
        : `/api/storage/${file.id}`,
    }));

    const response: ListResponse<FileRecord> = {
      items: files,
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage),
    };

    return c.json(response);
  } catch (error) {
    console.error("Failed to list files:", error);
    return c.json({ error: "Failed to list files" }, 500);
  }
});

// Upload file
storageRouter.post("/", async (c) => {
  try {
    // Get form data
    const formData = await c.req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return c.json({ error: "No file provided" }, 400);
    }

    // Parse metadata
    const metadataRaw: Record<string, any> = {};
    formData.forEach((value, key) => {
      if (key !== "file") {
        if (value === "true") metadataRaw[key] = true;
        else if (value === "false") metadataRaw[key] = false;
        else metadataRaw[key] = value;
      }
    });

    const metadata = fileMetadataSchema.parse(metadataRaw);

    // Generate file info
    const fileId = nanoid();
    const fileName = metadata.fileName || file.name;
    const contentType = metadata.contentType || file.type;
    const fileSize = file.size;
    const folder = metadata.folder
      ? `${metadata.folder.replace(/\/$/, "")}/`
      : "";
    const filePath = `${folder}${fileId}-${fileName}`;

    // Upload to R2
    const arrayBuffer = await file.arrayBuffer();

    await c.env.R2_BUCKET.put(filePath, arrayBuffer, {
      httpMetadata: {
        contentType,
      },
      customMetadata: {
        originalName: fileName,
        isPublic: String(metadata.isPublic),
      },
    });

    // Save metadata to database
    const now = new Date().toISOString();

    await c.env.DB.prepare(
      `
      INSERT INTO files (id, name, type, size, path, is_public, user_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    )
      .bind(
        fileId,
        fileName,
        contentType,
        fileSize,
        filePath,
        metadata.isPublic ? 1 : 0,
        "system", // For now, using system as user_id
        now,
        now
      )
      .run();

    // Get file info
    const fileInfo = (await c.env.DB.prepare("SELECT * FROM files WHERE id = ?")
      .bind(fileId)
      .first()) as FileRecord;

    return c.json(
      {
        ...fileInfo,
        is_public: Boolean(fileInfo.is_public),
        url: fileInfo.is_public
          ? `/api/storage/${fileId}/public`
          : `/api/storage/${fileId}`,
      },
      201
    );
  } catch (error) {
    console.error("Failed to upload file:", error);
    return c.json({ error: "Failed to upload file" }, 500);
  }
});

// Get file info
storageRouter.get("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const download = c.req.query("download") === "1";

    const file = (await c.env.DB.prepare("SELECT * FROM files WHERE id = ?")
      .bind(id)
      .first()) as FileRecord | null;

    if (!file) {
      return c.json({ error: "File not found" }, 404);
    }

    // Get file from R2
    const object = await c.env.R2_BUCKET.get(file.path);

    if (!object) {
      return c.json({ error: "File not found in storage" }, 404);
    }

    if (download) {
      const headers = new Headers();
      headers.set("Content-Type", file.type);
      headers.set("Content-Disposition", `attachment; filename="${file.name}"`);
      headers.set("Content-Length", String(file.size));

      return new Response(object.body, { headers });
    }

    return c.json({
      ...file,
      is_public: Boolean(file.is_public),
      url: `/api/storage/${id}?download=1`,
    });
  } catch (error) {
    console.error("Failed to get file:", error);
    return c.json({ error: "Failed to get file" }, 500);
  }
});

// Get public file
storageRouter.get("/:id/public", async (c) => {
  try {
    const id = c.req.param("id");

    const file = (await c.env.DB.prepare(
      "SELECT * FROM files WHERE id = ? AND is_public = 1"
    )
      .bind(id)
      .first()) as FileRecord | null;

    if (!file) {
      return c.json({ error: "File not found or not public" }, 404);
    }

    // Get file from R2
    const object = await c.env.R2_BUCKET.get(file.path);

    if (!object) {
      return c.json({ error: "File not found in storage" }, 404);
    }

    const headers = new Headers();
    headers.set("Content-Type", file.type);
    headers.set("Content-Length", String(file.size));
    headers.set("Cache-Control", "public, max-age=31536000"); // Cache for 1 year

    return new Response(object.body, { headers });
  } catch (error) {
    console.error("Failed to get public file:", error);
    return c.json({ error: "Failed to get file" }, 500);
  }
});

// Delete file
storageRouter.delete("/:id", async (c) => {
  try {
    const id = c.req.param("id");

    const file = (await c.env.DB.prepare("SELECT * FROM files WHERE id = ?")
      .bind(id)
      .first()) as FileRecord | null;

    if (!file) {
      return c.json({ error: "File not found" }, 404);
    }

    // Delete from R2
    await c.env.R2_BUCKET.delete(file.path);

    // Delete from database
    await c.env.DB.prepare("DELETE FROM files WHERE id = ?").bind(id).run();

    return c.text("", 204);
  } catch (error) {
    console.error("Failed to delete file:", error);
    return c.json({ error: "Failed to delete file" }, 500);
  }
});

export { storageRouter };
