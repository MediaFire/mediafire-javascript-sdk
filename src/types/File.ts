export interface FileInfo {
  fileInfo?: File;
  fileInfos?: File[];
}

export interface File {
  /**
   * The quickkey of the file
   */
  quickkey: string;
  /**
   * The name of the file	
   */
  filename: string;
  /**
   * The file type
   */
  filetype: string;
  /**
   * The mimetype of the file
   */
  mimetype: string;
  /**
   * The size of the file in bytes
   */
  size: number;
  /**
   * A bit-mask value specifying special details about the file
   */
  flag: number;
  /**
   * The SHA256 hash of a file. For some older files it will be the MD5 hash of the file
   */
  hash: number;
  /**
   * Indicates if a file is uploaded and ready to use
   */
  ready: boolean;
  /**
   * Indicates if the file is password protected
   */
  passwordProtected: boolean;
  /**
   * The revision number of the file
   */
  revision: number;
  /**
   * The description of the file
   */
  description: string;
  /**
   * The security of the file
   */
  privacy: 'public' | 'private';
  /**
   * The date and time the folder was created
   */
  createdUtc: string;
  /**
   * 	The date the file was moved to the trash (if applicable)
   */
  deleteDate?: string;
  /**
   * The owner of the file
   */
  ownerName?: string;
  /**
   * A comma-separated list of failed quickkeys
   */
  skipped?: string;
}

export interface FileUpdated {
  /**
   * The new revision number of the device
   */
  newDeviceRevision: number;
}

export interface FileMoved {
  /**
   * A collection of files entered that had their names changed to avoid collisions in the destination
   */
  newNames: object;
  /**
   * The new revision number of the device
   */
  newDeviceRevision: number;
}

export interface FileCopied {
  /**
   * The file key created for a successful copy of the origin file
   */
  newQuickey: object;
  /**
   * The amount of files which were not copied due to a restriction preventing the copy
   */
  skippedCount: number;
  /**
   * The amount of files which were not copied due to an error preventing the copy
   */
  otherCount: number;
  /**
   * The new revision number of the device
   */
  newDeviceRevision: number;
}

export interface FileDeleted {
  /**
   * The new revision number of the device
   */
  newDeviceRevision: number;
}

export interface FilePurged {
  /**
   * The new revision number of the device
   */
  newDeviceRevision: number;
}

export interface FileRecentlyModified {
  /**
   * The quickkeys of the file which were revised.
   */
  quickkeys: string[];
}

export interface FileZip {}
