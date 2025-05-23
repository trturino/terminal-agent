/**
 * Interface for plugin file operations
 */
export interface IPluginFileService {
    /**
     * Upload a plugin zip file for a specific UUID
     * @param uuid The UUID of the plugin
     * @param fileBuffer The file buffer to upload
     */
    uploadPluginZip(uuid: string, fileBuffer: Buffer): Promise<void>;

    /**
     * Delete all files for a plugin
     * @param uuid The UUID of the plugin
     * @returns True if the operation was successful
     */
    deletePluginFiles(uuid: string): Promise<boolean>;

    /**
     * Get a presigned URL for downloading a plugin
     * @param uuid The UUID of the plugin
     * @param expiresIn Time in seconds until the URL expires (default: 1 hour)
     * @returns The presigned URL
     */
    getPluginDownloadUrl(uuid: string, expiresIn?: number): Promise<string>;

    /**
     * Check if a plugin zip file exists
     * @param uuid The UUID of the plugin
     * @returns True if the plugin zip exists
     */
    pluginZipExists(uuid: string): Promise<boolean>;

    /**
     * List all files for a plugin
     * @param uuid The UUID of the plugin
     * @returns Array of file keys
     */
    listPluginFiles(uuid: string): Promise<string[]>;
}
