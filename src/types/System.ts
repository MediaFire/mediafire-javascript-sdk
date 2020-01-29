export interface SystemStatus {
  /**
   * Specifies whether the database is online or not
   */
  database: boolean;
  /**
   * Specifies whether the memcache cache is online or not
   */
  memcache: boolean;
  /**
   * Specifies whether the redis cache is online or not
   */
  redis: boolean;
}

export interface SystemLimits {
  /**
   * 	The maximum number of resource keys allowed to be passed to:
   *  - file/get_info,
   *  - file/copy,
   *  - file/delete
   *  - file/move,
   *  - folder/get_info
   *  - folder/copy
   *  - folder/delete
   *  - folder/move
   */
  maxKeys: number;
  /**
   * 	The maximum file size, in bytes, of any single chunk in a resumable upload
   */
  maxChunkFilesize: number;
  /**
   *  The maximum file size, in bytes, of any single file in the system
   */
  maxTotalFilesize: number;
  /**
   * The maximum number of results that can be returned by folder/get_siblings
   */
  maxObjects: number;
  /**
   * The maximum file size, in bytes, of an image to be uploaded
   */
  maxImageSize: number;
  /**
   * The maximum file size, in bytes, of a file to be added to a zip container
   */
  zipMaxFilesize: number;
  /**
   * The maximum file size of the zip container
   */
  zipMaxTotalFilesize: number;
  /**
   * The maximum number of items returned by folder/get_content
   */
  folderContentChunkSize: number;
  /**
   * The maximum number of chain folders returned by folder/get_depth
   */
  folderDepthLimit: number;
  /**
   * The maximum number of search results returned by folder/search
   */
  limitSearchResults: number;
  /**
   * The maximum number of changes returned by device/get_changes
   */
  deviceChangesListLimit: number;
  /**
   * The maximum number of items the system will process synchronously
   */
  maxSynchronousItems: number;
}
