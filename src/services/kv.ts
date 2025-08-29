import { Bindings } from '../types';

// Class quản lý KV store
export class KVService {
  private kv: KVNamespace;
  private namespace: string;
  private cacheTTL: number = 60 * 60; // 1 giờ mặc định

  constructor(kv: KVNamespace, namespace: string = '', cacheTTL?: number) {
    this.kv = kv;
    this.namespace = namespace ? `${namespace}:` : '';
    if (cacheTTL) this.cacheTTL = cacheTTL;
  }

  // Tạo key với namespace
  private getKey(key: string): string {
    return `${this.namespace}${key}`;
  }

  // Lấy giá trị
  async get<T = any>(key: string): Promise<T | null> {
    const fullKey = this.getKey(key);
    const value = await this.kv.get(fullKey, 'json');
    return value as T | null;
  }

  // Lấy nhiều giá trị
  async getMany<T = any>(keys: string[]): Promise<(T | null)[]> {
    const fullKeys = keys.map(key => this.getKey(key));
    const results = await Promise.all(fullKeys.map(key => this.kv.get(key, 'json')));
    return results as (T | null)[];
  }

  // Lưu giá trị
  async set<T>(key: string, value: T, options?: { expirationTtl?: number }): Promise<void> {
    const fullKey = this.getKey(key);
    await this.kv.put(fullKey, JSON.stringify(value), {
      expirationTtl: options?.expirationTtl || this.cacheTTL
    });
  }

  // Xóa giá trị
  async delete(key: string): Promise<void> {
    const fullKey = this.getKey(key);
    await this.kv.delete(fullKey);
  }

  // Lấy danh sách key theo prefix
  async list(options?: { prefix?: string, limit?: number }): Promise<{ keys: string[] }> {
    const prefix = options?.prefix ? this.getKey(options.prefix) : this.namespace;
    const result = await this.kv.list({ prefix, limit: options?.limit });
    return {
      keys: result.keys.map(key => key.name.replace(this.namespace, ''))
    };
  }
}

// Factory function để tạo các service cho các mục đích khác nhau
export function createKVServices(env: Bindings) {
  return {
    cache: new KVService(env.flarebase_KV, 'cache', 3600), // Cache (1 giờ)
    config: new KVService(env.flarebase_KV, 'config'), // Cấu hình hệ thống
    sessions: new KVService(env.flarebase_KV, 'sessions', 86400 * 7), // Phiên (7 ngày)
    rateLimit: new KVService(env.flarebase_KV, 'ratelimit', 60), // Rate limiting (1 phút)
    flags: new KVService(env.flarebase_KV, 'flags'), // Feature flags
  };
}