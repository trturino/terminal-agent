import { Timestamped } from './BaseModel';

export interface Plugin extends Timestamped {
  id: number;
  uuid: string;
  name: string;
  version: string;
  description: string | null;
  author: string | null;
  enabled: boolean;
  created_at?: Date;
  updated_at?: Date;
}

// This is now just a type alias for backward compatibility
export type PluginModel = Plugin;
