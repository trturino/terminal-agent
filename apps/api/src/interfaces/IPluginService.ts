import { Timestamped } from "../models/BaseModel";

export interface IPlugin extends Timestamped {
  id?: number;
  uuid: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  enabled: boolean;
  metadata?: Record<string, any>;
}

export interface IPluginService {
  createPlugin(pluginData: Omit<IPlugin, 'id' | 'created_at' | 'updated_at'>): Promise<IPlugin>;
  getPluginById(id: number): Promise<IPlugin | null>;
  getPluginByUuid(uuid: string): Promise<IPlugin | null>;
  updatePlugin(id: number, pluginData: Partial<Omit<IPlugin, 'id' | 'uuid' | 'created_at' | 'updated_at'>>): Promise<IPlugin | null>;
  deletePlugin(id: number): Promise<boolean>;
  listPlugins(limit?: number, offset?: number): Promise<{ plugins: IPlugin[]; total: number }>;
  uploadPluginFiles(uuid: string, files: { filename: string; content: Buffer }[]): Promise<void>;
  deletePluginFiles(uuid: string): Promise<void>;
}
