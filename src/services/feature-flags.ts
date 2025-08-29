import { createKVServices } from './kv';
import { Bindings } from '../types';

interface FeatureFlag {
  name: string;
  enabled: boolean;
  description?: string;
  rules?: {
    userIds?: string[];
    roles?: string[];
    percentage?: number;
    environments?: string[];
  };
}

export class FeatureFlagsService {
  private kvFlags;

  constructor(env: Bindings) {
    const { flags } = createKVServices(env);
    this.kvFlags = flags;
  }

  // Lấy tất cả flags
  async getAll(): Promise<FeatureFlag[]> {
    const { keys } = await this.kvFlags.list();
    
    if (keys.length === 0) {
      return [];
    }
    
    const flags = await this.kvFlags.getMany<FeatureFlag>(keys);
    return flags.filter(Boolean) as FeatureFlag[];
  }

  // Lấy một flag cụ thể
  async get(name: string): Promise<FeatureFlag | null> {
    return this.kvFlags.get<FeatureFlag>(name);
  }

  // Kiểm tra flag có enabled không
  async isEnabled(name: string, context?: {
    userId?: string;
    role?: string;
    environment?: string;
  }): Promise<boolean> {
    const flag = await this.get(name);
    
    if (!flag) {
      return false;
    }
    
    // Nếu không có rules, trả về trạng thái enabled
    if (!flag.rules || Object.keys(flag.rules).length === 0) {
      return flag.enabled;
    }
    
    // Nếu feature đã disabled hoàn toàn
    if (!flag.enabled) {
      return false;
    }
    
    // Kiểm tra các rules
    const { rules } = flag;
    
    // Kiểm tra userId
    if (context?.userId && rules.userIds && rules.userIds.length > 0) {
      if (rules.userIds.includes(context.userId)) {
        return true;
      }
    }
    
    // Kiểm tra role
    if (context?.role && rules.roles && rules.roles.length > 0) {
      if (rules.roles.includes(context.role)) {
        return true;
      }
    }
    
    // Kiểm tra environment
    if (context?.environment && rules.environments && rules.environments.length > 0) {
      if (!rules.environments.includes(context.environment)) {
        return false;
      }
    }
    
    // Kiểm tra percentage
    if (rules.percentage !== undefined) {
      const random = Math.random() * 100;
      if (random <= rules.percentage) {
        return true;
      }
    }
    
    return flag.enabled;
  }

  // Tạo hoặc cập nhật flag
  async set(flag: FeatureFlag): Promise<FeatureFlag> {
    await this.kvFlags.set(flag.name, flag);
    return flag;
  }

  // Xóa flag
  async delete(name: string): Promise<void> {
    await this.kvFlags.delete(name);
  }
}