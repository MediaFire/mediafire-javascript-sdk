export interface DeviceChanges {
  todo: any;
}

export interface DeviceForeignResources {
  todo: any;
}

export interface DeviceStatus {
  todo: any;
}

export interface DeviceTrash {
  name: string;
  revision: number;
  folderkey: number;
  chunkSize: number;
  chunkNumber: number;
  contentType: string;
  moreChunks: boolean;
  folderCount: number;
  fileCount: number;
  folders: any[];
  files: any[];
}
