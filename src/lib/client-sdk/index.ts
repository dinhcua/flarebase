/**
 * flarebase Client SDK
 * TypeScript client for interacting with flarebase backend
 */

import type {
  FlarebaseConfig,
  ListOptions,
  ListResponse,
  Collection,
  User,
  FileRecord,
  AuthResponse,
  UploadOptions,
  CreateCollectionData,
  UpdateCollectionData,
  FlarebaseClient,
} from "@/types/flarebase";

export class flarebase implements FlarebaseClient {
  private config: FlarebaseConfig;

  constructor(baseUrl: string, token?: string) {
    this.config = {
      baseUrl: baseUrl.replace(/\/$/, ""),
      token,
      timeout: 30000,
    };
  }

  // Authentication methods
  get auth() {
    return {
      login: async (email: string, password: string): Promise<AuthResponse> => {
        const response = await this.request("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });
        if (response.token) {
          this.setToken(response.token);
        }
        return response;
      },

      register: async (
        email: string,
        password: string,
        name?: string
      ): Promise<AuthResponse> => {
        const response = await this.request("/api/auth/register", {
          method: "POST",
          body: JSON.stringify({ email, password, name }),
        });
        if (response.token) {
          this.setToken(response.token);
        }
        return response;
      },

      getCurrentUser: async (): Promise<User> => {
        return this.request("/api/auth/me");
      },

      logout: async (): Promise<void> => {
        await this.request("/api/auth/logout", {
          method: "POST",
        });
        this.config.token = undefined;
        if (typeof localStorage !== "undefined") {
          localStorage.removeItem("authToken");
        }
      },

      isAuthenticated: (): boolean => {
        return !!this.config.token;
      },

      setToken: (token: string): void => {
        this.config.token = token;
        if (typeof localStorage !== "undefined") {
          localStorage.setItem("authToken", token);
        }
      },
    };
  }

  // Collection methods
  collection<T = any>(name: string) {
    return {
      getList: async (options: ListOptions = {}): Promise<ListResponse<T>> => {
        const params = new URLSearchParams();
        if (options.page) params.append("page", options.page.toString());
        if (options.perPage)
          params.append("perPage", options.perPage.toString());
        if (options.sort) params.append("sort", options.sort);
        if (options.filter) params.append("filter", options.filter);

        const query = params.toString();
        const url = `/api/collections/${name}/records${
          query ? `?${query}` : ""
        }`;

        return this.request(url);
      },

      getOne: async (id: string): Promise<T> => {
        return this.request(`/api/collections/${name}/records/${id}`);
      },

      create: async (data: Partial<T>): Promise<T> => {
        return this.request(`/api/collections/${name}/records`, {
          method: "POST",
          body: JSON.stringify(data),
        });
      },

      update: async (id: string, data: Partial<T>): Promise<T> => {
        return this.request(`/api/collections/${name}/records/${id}`, {
          method: "PUT",
          body: JSON.stringify(data),
        });
      },

      delete: async (id: string): Promise<void> => {
        await this.request(`/api/collections/${name}/records/${id}`, {
          method: "DELETE",
        });
      },
    };
  }

  // Collections management
  get collections() {
    return {
      list: async (): Promise<Collection[]> => {
        return this.request("/api/collections");
      },

      create: async (data: CreateCollectionData): Promise<Collection> => {
        return this.request("/api/collections", {
          method: "POST",
          body: JSON.stringify({
            name: data.name,
            schema: JSON.stringify(data.schema),
          }),
        });
      },

      get: async (id: string): Promise<Collection> => {
        return this.request(`/api/collections/${id}`);
      },

      getOne: async (id: string): Promise<Collection> => {
        return this.request(`/api/collections/${id}`);
      },

      update: async (
        id: string,
        data: UpdateCollectionData
      ): Promise<Collection> => {
        const payload: any = {};
        if (data.name) payload.name = data.name;
        if (data.schema) payload.schema = JSON.stringify(data.schema);

        return this.request(`/api/collections/${id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      },

      delete: async (id: string): Promise<void> => {
        await this.request(`/api/collections/${id}`, {
          method: "DELETE",
        });
      },
    };
  }

  // File storage methods
  get storage() {
    return {
      upload: async (
        file: File,
        options: UploadOptions = {}
      ): Promise<FileRecord> => {
        const formData = new FormData();
        formData.append("file", file);

        if (options.fileName) formData.append("fileName", options.fileName);
        if (options.contentType)
          formData.append("contentType", options.contentType);
        if (options.isPublic !== undefined)
          formData.append("isPublic", options.isPublic.toString());
        if (options.folder) formData.append("folder", options.folder);

        return this.request("/api/storage", {
          method: "POST",
          body: formData,
          headers: {}, // Don't set Content-Type for FormData
        });
      },

      getList: async (
        options: { prefix?: string; page?: number; perPage?: number } = {}
      ): Promise<ListResponse<FileRecord>> => {
        const params = new URLSearchParams();
        if (options.prefix) params.append("prefix", options.prefix);
        if (options.page) params.append("page", options.page.toString());
        if (options.perPage)
          params.append("perPage", options.perPage.toString());

        const query = params.toString();
        const url = `/api/storage${query ? `?${query}` : ""}`;

        return this.request(url);
      },

      getOne: async (id: string): Promise<FileRecord> => {
        return this.request(`/api/storage/${id}`);
      },

      delete: async (id: string): Promise<void> => {
        await this.request(`/api/storage/${id}`, {
          method: "DELETE",
        });
      },

      getPublicUrl: (id: string): string => {
        return `${this.config.baseUrl}/api/storage/${id}/public`;
      },
    };
  }

  // Private helper methods
  private async request(url: string, options: RequestInit = {}) {
    const headers = this.getHeaders(options.headers as Record<string, string>);

    const config: RequestInit = {
      ...options,
      headers,
    };

    const response = await fetch(`${this.config.baseUrl}${url}`, config);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || `HTTP ${response.status}: ${response.statusText}`
      );
    }

    if (response.status === 204) {
      return undefined;
    }

    return response.json();
  }

  private getHeaders(customHeaders: Record<string, string> = {}) {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...customHeaders,
    };

    if (this.config.token) {
      headers.Authorization = `Bearer ${this.config.token}`;
    }

    return headers;
  }

  // Set authentication token
  setToken(token: string) {
    this.config.token = token;
  }

  // Remove authentication token
  clearToken() {
    this.config.token = undefined;
  }

  // Add missing methods and properties to match FlarebaseClient interface
  get baseUrl(): string {
    return this.config.baseUrl;
  }

  async fetchApi(path: string, options?: RequestInit): Promise<any> {
    return this.request(path, options);
  }

  // Realtime (simplified implementation)
  get realtime() {
    return {
      subscribe: async (collection: string): Promise<WebSocket> => {
        const wsUrl = `${this.config.baseUrl.replace(
          "http",
          "ws"
        )}/api/realtime?collection=${collection}`;
        return new WebSocket(wsUrl);
      },

      publish: async (collection: string, event: any): Promise<void> => {
        await this.request("/api/realtime/publish", {
          method: "POST",
          body: JSON.stringify({ collection, event }),
        });
      },
    };
  }

  // Presence (simplified implementation)
  get presence() {
    return {
      connect: async (userId: string): Promise<WebSocket> => {
        const wsUrl = `${this.config.baseUrl.replace(
          "http",
          "ws"
        )}/api/presence?userId=${userId}`;
        return new WebSocket(wsUrl);
      },

      updateStatus: async (
        userId: string,
        status: string,
        metadata?: any
      ): Promise<void> => {
        await this.request("/api/presence/status", {
          method: "POST",
          body: JSON.stringify({ userId, status, metadata }),
        });
      },

      getUsers: async (): Promise<any[]> => {
        return this.request("/api/presence/users");
      },

      disconnect: async (userId: string): Promise<void> => {
        await this.request("/api/presence/disconnect", {
          method: "POST",
          body: JSON.stringify({ userId }),
        });
      },
    };
  }

  // Backup
  get backup() {
    return {
      export: async (collection?: string): Promise<any> => {
        const url = collection
          ? `/api/backup/export?collection=${collection}`
          : "/api/backup/export";
        return this.request(url);
      },

      import: async (data: any, overwrite?: boolean): Promise<any> => {
        return this.request("/api/backup/import", {
          method: "POST",
          body: JSON.stringify({ data, overwrite }),
        });
      },
    };
  }

  // Settings
  get settings() {
    return {
      get: async (key?: string): Promise<any> => {
        const url = key ? `/api/settings/${key}` : "/api/settings";
        return this.request(url);
      },

      set: async (key: string, value: any): Promise<void> => {
        await this.request(`/api/settings/${key}`, {
          method: "PUT",
          body: JSON.stringify({ value }),
        });
      },

      reset: async (): Promise<void> => {
        await this.request("/api/settings/reset", {
          method: "POST",
        });
      },
    };
  }
}

export default flarebase;
