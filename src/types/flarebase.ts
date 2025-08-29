// flarebase Client Types
export interface FlarebaseConfig {
  baseUrl: string;
  token?: string;
  timeout?: number;
}

export interface ListOptions {
  page?: number;
  perPage?: number;
  sort?: string;
  filter?: string;
}

export interface ListResponse<T> {
  items: T[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export interface Collection {
  id: string;
  name: string;
  schema: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  role: "admin" | "user";
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
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface UploadOptions {
  isPublic?: boolean;
  folder?: string;
  fileName?: string;
  contentType?: string;
}

export interface CreateCollectionData {
  name: string;
  schema: any;
}

export interface UpdateCollectionData {
  name?: string;
  schema?: any;
}

// flarebase Client Interface
export interface FlarebaseClient {
  // Auth methods
  auth: {
    register: (
      email: string,
      password: string,
      name?: string
    ) => Promise<AuthResponse>;
    login: (email: string, password: string) => Promise<AuthResponse>;
    logout: () => Promise<void>;
    getCurrentUser: () => Promise<User>;
    isAuthenticated: () => boolean;
    setToken: (token: string) => void;
  };

  // Collections management
  collections: {
    list: () => Promise<Collection[]>;
    create: (data: CreateCollectionData) => Promise<Collection>;
    get: (id: string) => Promise<Collection>;
    getOne: (id: string) => Promise<Collection>;
    update: (id: string, data: UpdateCollectionData) => Promise<Collection>;
    delete: (id: string) => Promise<void>;
  };

  // Collection records
  collection: <T = any>(
    name: string
  ) => {
    getList: (options?: ListOptions) => Promise<ListResponse<T>>;
    getOne: (id: string) => Promise<T>;
    create: (data: Partial<T>) => Promise<T>;
    update: (id: string, data: Partial<T>) => Promise<T>;
    delete: (id: string) => Promise<void>;
  };

  // File storage
  storage: {
    upload: (file: File, options?: UploadOptions) => Promise<FileRecord>;
    getList: (options?: {
      prefix?: string;
      page?: number;
      perPage?: number;
    }) => Promise<ListResponse<FileRecord>>;
    getOne: (id: string) => Promise<FileRecord>;
    delete: (id: string) => Promise<void>;
    getPublicUrl: (id: string) => string;
  };

  // Realtime
  realtime: {
    subscribe: (collection: string) => Promise<WebSocket>;
    publish: (collection: string, event: any) => Promise<void>;
  };

  // Presence
  presence: {
    connect: (userId: string) => Promise<WebSocket>;
    updateStatus: (
      userId: string,
      status: string,
      metadata?: any
    ) => Promise<void>;
    getUsers: () => Promise<any[]>;
    disconnect: (userId: string) => Promise<void>;
  };

  // Backup
  backup: {
    export: (collection?: string) => Promise<any>;
    import: (data: any, overwrite?: boolean) => Promise<any>;
  };

  // Settings
  settings: {
    get: (key?: string) => Promise<any>;
    set: (key: string, value: any) => Promise<void>;
    reset: () => Promise<void>;
  };

  // Utility
  fetchApi: (path: string, options?: RequestInit) => Promise<any>;
  baseUrl: string;
}
