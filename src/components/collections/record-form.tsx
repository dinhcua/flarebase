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
import { Checkbox } from "@/components/ui/checkbox";

interface RecordFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  record: any | null;
  schema: any;
}

export default function RecordFormModal({
  isOpen,
  onClose,
  onSubmit,
  record,
  schema,
}: RecordFormModalProps) {
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    if (record) {
      // Remove system fields from editing
      const { id, created_at, updated_at, ...editableData } = record;
      setFormData(editableData);
    } else {
      // Initialize with default values from schema
      const defaultData: any = {};
      if (schema?.properties) {
        Object.entries(schema.properties).forEach(
          ([key, field]: [string, any]) => {
            if (field.default !== undefined) {
              defaultData[key] = field.default;
            } else if (field.type === "boolean") {
              defaultData[key] = false;
            } else if (field.type === "string") {
              defaultData[key] = "";
            } else if (field.type === "number" || field.type === "integer") {
              defaultData[key] = 0;
            }
          }
        );
      }
      setFormData(defaultData);
    }
  }, [record, schema]);

  const handleInputChange = (key: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const renderField = (key: string, field: any) => {
    const value = formData[key] || "";

    switch (field.type) {
      case "boolean":
        return (
          <div className="flex items-center space-x-2" key={key}>
            <Checkbox
              id={key}
              checked={formData[key] || false}
              onCheckedChange={(checked) => handleInputChange(key, checked)}
            />
            <Label htmlFor={key}>{key}</Label>
          </div>
        );

      case "number":
      case "integer":
        return (
          <div className="space-y-2" key={key}>
            <Label htmlFor={key}>{key}</Label>
            <Input
              id={key}
              type="number"
              value={value}
              onChange={(e) =>
                handleInputChange(key, parseFloat(e.target.value) || 0)
              }
            />
          </div>
        );

      case "string":
        if (
          field.format === "textarea" ||
          key === "content" ||
          key === "description"
        ) {
          return (
            <div className="space-y-2" key={key}>
              <Label htmlFor={key}>{key}</Label>
              <Textarea
                id={key}
                value={value}
                onChange={(e) => handleInputChange(key, e.target.value)}
                placeholder={`Enter ${key}...`}
              />
            </div>
          );
        }

        return (
          <div className="space-y-2" key={key}>
            <Label htmlFor={key}>{key}</Label>
            <Input
              id={key}
              type="text"
              value={value}
              onChange={(e) => handleInputChange(key, e.target.value)}
              placeholder={`Enter ${key}...`}
            />
          </div>
        );

      default:
        return (
          <div className="space-y-2" key={key}>
            <Label htmlFor={key}>{key}</Label>
            <Input
              id={key}
              type="text"
              value={value}
              onChange={(e) => handleInputChange(key, e.target.value)}
              placeholder={`Enter ${key}...`}
            />
          </div>
        );
    }
  };

  const fields = schema?.properties
    ? Object.keys(schema.properties).filter(
        (key) => !["id", "created_at", "updated_at"].includes(key)
      )
    : [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {record ? "Edit Record" : "Create New Record"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            {fields.length > 0 ? (
              fields.map((key) => renderField(key, schema.properties[key]))
            ) : (
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  type="text"
                  value={formData.title || ""}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                  placeholder="Enter title..."
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">{record ? "Update" : "Create"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
