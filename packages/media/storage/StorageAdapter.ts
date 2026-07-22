export interface StorageAdapter {
  provider: string; // "local", "s3", "r2", etc.
  
  /**
   * Saves a buffer to storage and returns a unique storageKey
   */
  put(key: string, buffer: Buffer, mimeType?: string): Promise<string>;
  
  /**
   * Retrieves a buffer from storage
   */
  get(key: string): Promise<Buffer>;
  
  /**
   * Generates a public URL for the client to download/view the asset.
   * Only meaningful for public buckets — for private, user-owned assets use
   * getSignedUrl instead.
   */
  getPublicUrl(key: string): string;

  /**
   * Generates a time-limited signed URL for a private asset.
   */
  getSignedUrl(key: string, expiresInSeconds: number): Promise<string>;

  /**
   * Deletes an asset
   */
  delete(key: string): Promise<void>;
}
