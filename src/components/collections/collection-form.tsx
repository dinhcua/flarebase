"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Collection } from "@/types/collection";

const collectionSchema = z.object({
  name: z
    .string()
    .min(1, "Tên collection không được để trống")
    .regex(
      /^[a-z0-9_]+$/,
      "Tên collection chỉ được chứa chữ thường, số và dấu gạch dưới"
    ),
  schema: z.string().refine(
    (val) => {
      try {
        const parsed = JSON.parse(val);
        return typeof parsed === "object" && parsed !== null;
      } catch {
        return false;
      }
    },
    { message: "Schema phải là JSON hợp lệ" }
  ),
});

type CollectionFormValues = z.infer<typeof collectionSchema>;

interface CollectionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  collection: Collection | null;
}

const defaultSchema = `{
  "id": {
    "type": "string",
    "required": true
  },
  "title": {
    "type": "string",
    "required": true
  },
  "content": {
    "type": "string",
    "required": false
  },
  "published": {
    "type": "boolean",
    "default": false
  },
  "created_at": {
    "type": "string",
    "format": "date-time",
    "required": true
  },
  "updated_at": {
    "type": "string",
    "format": "date-time",
    "required": true
  }
}`;

export default function CollectionFormModal({
  isOpen,
  onClose,
  onSubmit,
  collection,
}: CollectionFormModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    reset,
    watch,
  } = useForm<CollectionFormValues>({
    resolver: zodResolver(collectionSchema),
    defaultValues: {
      name: "",
      schema: defaultSchema,
    },
  });

  const [schemaValue, setSchemaValue] = useState(defaultSchema);
  const watchedSchema = watch("schema");

  useEffect(() => {
    if (collection) {
      setValue("name", collection.name);
      try {
        const parsedSchema = JSON.parse(collection.schema);
        const formattedSchema = JSON.stringify(parsedSchema, null, 2);
        setValue("schema", formattedSchema);
        setSchemaValue(formattedSchema);
      } catch (error) {
        console.error("Error parsing schema:", error);
        setValue("schema", collection.schema);
        setSchemaValue(collection.schema);
      }
    } else {
      reset({
        name: "",
        schema: defaultSchema,
      });
      setSchemaValue(defaultSchema);
    }
  }, [collection, setValue, reset]);

  const handleSchemaChange = (value: string) => {
    setSchemaValue(value);
    setValue("schema", value);
  };

  const submitForm = (data: CollectionFormValues) => {
    try {
      const parsedSchema = JSON.parse(data.schema);
      onSubmit({
        name: data.name,
        schema: parsedSchema,
      });
    } catch (error) {
      console.error("Error parsing schema:", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {collection ? "Chỉnh sửa Collection" : "Tạo Collection Mới"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(submitForm)} className="space-y-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Tên Collection</Label>
              <Input
                id="name"
                placeholder="posts, users, products..."
                {...register("name")}
              />
              {errors.name && (
                <p className="text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="schema">Schema (JSON)</Label>
              <Textarea
                id="schema"
                value={schemaValue}
                onChange={(e) => {
                  setSchemaValue(e.target.value);
                  setValue("schema", e.target.value);
                }}
                className="min-h-[300px] font-mono"
                placeholder="Nhập JSON schema..."
              />
              <input type="hidden" {...register("schema")} />
              {errors.schema && (
                <p className="text-sm text-red-600">{errors.schema.message}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Hủy
            </Button>
            <Button type="submit">
              {collection ? "Cập nhật" : "Tạo Collection"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
