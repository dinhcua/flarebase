// Model types for the application
export interface User {
  id: string;
  email: string;
  name?: string;
  bio?: string;
  role: "admin" | "user";
  created_at: string;
  updated_at: string;
}

export interface Post {
  id: string;
  title: string;
  content: string;
  tags: string[];
  user_id?: string;
  created_at: string;
  updated_at: string;
}

export interface FileRecord {
  id: string;
  name: string;
  type: string;
  size: number;
  path: string;
  is_public: boolean;
  user_id?: string;
  url?: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Collection {
  id: string;
  name: string;
  schema: string;
  created_at: string;
  updated_at: string;
}
