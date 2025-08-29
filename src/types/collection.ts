export interface Collection {
  id: string;
  name: string;
  schema: string;
  created_at: string;
  updated_at: string;
}

export interface CollectionSchema {
  type: string;
  properties: Record<string, SchemaProperty>;
  required?: string[];
}

export interface SchemaProperty {
  type: "string" | "number" | "integer" | "boolean" | "array" | "object";
  format?: string;
  default?: any;
  required?: boolean;
  description?: string;
}
