import { createKVServices } from './kv';
import { Bindings } from '../types';

// Định nghĩa kiểu dữ liệu cấu hình
export interface SystemConfig {
  site_name: string;
  site_description?: string;
  allow_signups: boolean;
  default_user_role: string;
  email_verification_required: boolean;
  maintenance_mode: boolean;
  theme: {
    primary_color: string;
    logo_url?: string;
  };
  limits: {
    max_file_size: number; // Bytes
    max_records_per_request: number;
  };
  integrations: Record<string, any>;
}

// Default config
const DEFAULT_CONFIG: SystemConfig = {
  site_name: 'flarebase',
  site_description: 'A modern backend as a service',
  allow_signups: true,
  default_user_role: 'user',
  email_verification_required: false,
  maintenance_mode: false,
  theme: {
    primary_color: '#3b82f6',
  },
  limits: {
    max_file_size: 10 * 1024 * 1024, // 10MB
    max_records_per_request: 100,
  },
  integrations: {},
};

export class ConfigService {
  private config: SystemConfig | null = null;
  private kvConfig;

  constructor(env: Bindings) {
    const { config } = createKVServices(env);
    this.kvConfig = config;
  }

  // Lấy toàn bộ cấu hình
  async getAll(): Promise<SystemConfig> {
    if (this.config) {
      return this.config;
    }

    // Lấy từ KV
    const storedConfig = await this.kvConfig.get<SystemConfig>('system');
    
    if (storedConfig) {
      this.config = { ...DEFAULT_CONFIG, ...storedConfig };
    } else {
      this.config = DEFAULT_CONFIG;
      // Lưu cấu hình mặc định nếu chưa có
      await this.kvConfig.set('system', DEFAULT_CONFIG);
    }

    return this.config;
  }

  // Lấy một giá trị cấu hình cụ thể
  async get<K extends keyof SystemConfig>(key: K): Promise<SystemConfig[K]> {
    const config = await this.getAll();
    return config[key];
  }

  // Cập nhật cấu hình
  async update(partialConfig: Partial<SystemConfig>): Promise<SystemConfig> {
    const currentConfig = await this.getAll();
    
    // Deep merge config
    const newConfig = this.deepMerge(currentConfig, partialConfig);
    
    // Lưu vào KV
    await this.kvConfig.set('system', newConfig);
    
    // Cập nhật cache
    this.config = newConfig;
    
    return newConfig;
  }

  // Reset về cấu hình mặc định
  async reset(): Promise<SystemConfig> {
    await this.kvConfig.set('system', DEFAULT_CONFIG);
    this.config = DEFAULT_CONFIG;
    return DEFAULT_CONFIG;
  }

  // Helper để deep merge objects
  private deepMerge<T>(target: T, source: Partial<T>): T {
    const output = { ...target };
    
    if (isObject(target) && isObject(source)) {
      Object.keys(source).forEach(key => {
        if (isObject(source[key])) {
          if (!(key in target)) {
            Object.assign(output, { [key]: source[key] });
          } else {
            output[key] = this.deepMerge(target[key], source[key]);
          }
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      });
    }
    
    return output;
  }
}

// Helper function
function isObject(item: any): item is Record<string, any> {
  return (item && typeof item === 'object' && !Array.isArray(item));
}