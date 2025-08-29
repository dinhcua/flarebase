/**
 * flarebase Client SDK
 * TypeScript client for interacting with flarebase backend
 */

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

export interface AuthResponse {
  user: any;
  token: string;
}

export interface UploadOptions {
  isPublic?: boolean;
  folder?: string;
  fileName?: string;
  contentType?: string;
}

export class flarebase {
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
        return response;
      },

      me: async () => {
        const response = await this.request("/api/auth/me");
        return response;
      },

      logout: async () => {
        const response = await this.request("/api/auth/logout", {
          method: "POST",
        });
        return response;
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
      list: async () => {
        return this.request("/api/collections");
      },

      create: async (name: string, schema: any) => {
        return this.request("/api/collections", {
          method: "POST",
          body: JSON.stringify({ name, schema: JSON.stringify(schema) }),
        });
      },

      get: async (id: string) => {
        return this.request(`/api/collections/${id}`);
      },

      update: async (id: string, name: string, schema: any) => {
        return this.request(`/api/collections/${id}`, {
          method: "PUT",
          body: JSON.stringify({ name, schema: JSON.stringify(schema) }),
        });
      },

      delete: async (id: string) => {
        await this.request(`/api/collections/${id}`, {
          method: "DELETE",
        });
      },
    };
  }

  // File storage methods
  get storage() {
    return {
      upload: async (file: File, options: UploadOptions = {}) => {
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
      ) => {
        const params = new URLSearchParams();
        if (options.prefix) params.append("prefix", options.prefix);
        if (options.page) params.append("page", options.page.toString());
        if (options.perPage)
          params.append("perPage", options.perPage.toString());

        const query = params.toString();
        const url = `/api/storage${query ? `?${query}` : ""}`;

        return this.request(url);
      },

      getOne: async (id: string) => {
        return this.request(`/api/storage/${id}`);
      },

      delete: async (id: string) => {
        await this.request(`/api/storage/${id}`, {
          method: "DELETE",
        });
      },

      getPublicUrl: (id: string) => {
        return `${this.config.baseUrl}/api/storage/${id}/public`;
      },
    };
  }

  // Realtime subscriptions
  get realtime() {
    return {
      subscribe: <T = any>(
        collection: string,
        callback: (event: any) => void
      ) => {
        const wsUrl =
          this.config.baseUrl.replace("http", "ws") + "/api/realtime";
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          ws.send(
            JSON.stringify({
              type: "subscribe",
              collection,
            })
          );
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "event" && data.collection === collection) {
              callback(data);
            }
          } catch (error) {
            console.error("Error parsing realtime message:", error);
          }
        };

        return {
          unsubscribe: () => {
            ws.send(
              JSON.stringify({
                type: "unsubscribe",
                collection,
              })
            );
            ws.close();
          },
        };
      },
    };
  }

  // User presence
  get presence() {
    return {
      subscribeToPresence: (callback: (event: any) => void) => {
        const wsUrl =
          this.config.baseUrl.replace("http", "ws") + "/api/presence/connect";
        const ws = new WebSocket(wsUrl);

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "presenceEvent") {
              callback(data);
            }
          } catch (error) {
            console.error("Error parsing presence message:", error);
          }
        };

        return {
          disconnect: () => {
            ws.close();
          },
        };
      },

      updateStatus: async (status: string, metadata?: any) => {
        return this.request("/api/presence/status", {
          method: "POST",
          body: JSON.stringify({ status, metadata }),
        });
      },

      getOnlineUsers: async () => {
        return this.request("/api/presence/users");
      },
    };
  }

  // Backup methods
  get backup() {
    return {
      export: async (collection?: string) => {
        const params = collection ? `?collection=${collection}` : "";
        const url = `/api/backup/export${params}`;

        const response = await fetch(`${this.config.baseUrl}${url}`, {
          headers: this.getHeaders(),
        });

        if (!response.ok) {
          throw new Error(`Export failed: ${response.statusText}`);
        }

        return response.blob();
      },

      import: async (file: File, overwrite = false) => {
        const formData = new FormData();
        formData.append("file", file);

        const params = overwrite ? "?overwrite=true" : "";
        return this.request(`/api/backup/import${params}`, {
          method: "POST",
          body: formData,
          headers: {},
        });
      },
    };
  }

  // Settings methods
  get settings() {
    return {
      get: async () => {
        return this.request("/api/settings");
      },

      update: async (settings: any) => {
        return this.request("/api/settings", {
          method: "PUT",
          body: JSON.stringify(settings),
        });
      },

      reset: async () => {
        return this.request("/api/settings/reset", {
          method: "POST",
        });
      },

      getKey: async (key: string) => {
        return this.request(`/api/settings/${key}`);
      },

      setKey: async (key: string, value: any) => {
        return this.request(`/api/settings/${key}`, {
          method: "PUT",
          body: JSON.stringify({ value }),
        });
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
}

export default flarebase;
