/**
 * #### [[Folder.getInfo]] API Response
 */
export interface FolderInfo {
  /**
   * The folderkey
   */
  folderkey: string;
  /**
   * The name of the folder
   */
  name: string;
  /**
   * A bit-mask value specifying special details about the folder or file
   */
  flag: number;
  /**
   * The revision number of the folder
   */
  revision: number;
  /**
   * The folder description
   */
  description: string;
  /**
   * The security of the file
   */
  privacy: 'public' | 'private';
  /**
   * The amount of files contained in the folder
   */
  fileCount: number;
  /**
   * The amount of folders in the folder
   */
  folderCount: number;
  /**
   * The date and time the folder was created
   */
  createdUtc: string;
  /**
   * 	The date the file was moved to the trash (if applicable)
   */
  deleteDate?: string;
  /**
   * The owner of the folder (if applicable)
   */
  ownerName?: string;
}

/**
 * #### [[Folder.getDepth]] API Response
 */
export interface FolderDepth {
  /**
   * The numerical distance of the specified folder from the root folder
   */
  depth: number;
  /**
   * A collection of folders, starting with the specified folder, linking back to root
   */
  chainFolders: [
    {
      folderkey: string,
      name: string,
    },
  ];
}

/**
 * #### [[Folder.getContent]] API Response
 */
export interface FolderContent {
  /**
   * The number of items returned in a single chunk
   */
  chunkSize: 0;
  /**
   * The type of content requested
   */
  contentType: 'files' | 'folders';
  /**
   * The chunk number
   */
  chunkNumber: number;
  /**
   * Indicates whether more chunks are available
   */
  moreChunks: boolean;
}

export interface FolderUpdated {
  todo: any;
}

export interface FolderMoved {
  todo: any;
}

export interface FolderCopied {
  todo: any;
}

export interface FolderDeleted {
  todo: any;
}

export interface FolderPurged {
  todo: any;
}

export interface FolderConfiguredFiledrop {
  todo: any;
}

export interface FolderSearch {
  todo: any;
}
