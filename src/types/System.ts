export interface SystemStatus {
  database: boolean;
  memcache: boolean;
  redis: boolean;
}

export interface SystemLimits {
  maxKeys: number;
  maxChunkFilesize: number;
  maxTotalFilesize: number;
  maxObjects: number;
  maxImageSize: number;
  zipMaxFilesize: number;
  zipMaxTotalFilesize: number;
  folderContentChunkSize: number;
  folderDepthLimit: number;
  limitSearchResults: number;
  deviceChangesListLimit: number;
  maxSynchronousItems: number;
}
