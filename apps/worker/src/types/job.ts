export type ColorType = "rgb565" | "rgba8888" | "indexed8" | "grayscale";

export interface DeviceProfile {
  width: number;
  height: number;
  format: "bmp" | "png";
}

export interface ColorScheme {
  type: ColorType;
  palette?: string[]; // HEX colors, required when type = "indexed8"
}

export interface JobPayload {
  id: string; // UUID job id
  tmpZipPath: string; // local path to ZIP (mounted by API)
  deviceProfile: DeviceProfile;
  colorScheme?: ColorScheme;
}

export interface ProcessedJobResult {
  imageKey: string;
  metadata: {
    width: number;
    height: number;
    format: string;
    size: number;
  };
}
