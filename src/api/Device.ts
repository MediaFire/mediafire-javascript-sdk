import * as MF from '../types/Device';
import {Client} from '../lib/client';

export class Device extends Client {
  constructor (public host?: string, public token?: string) {
    super('device', host, token);
  }

  /**
   * Returns the list of all files and folders with revisions greater than the
   * passed parameter revision and less than or equal to the next 500-multiplier.
   *
   * @param revision - The device revision after which the changes to be returned occur
   * @param deviceId - The ID of the device. If not passed, it uses the cloud device
   */
  async getChanges(revision: number, deviceId?: number) {
    return await this.post<MF.DeviceChanges>('get_changes.php', {
      revision, deviceId,
    });
  }

  /**
   * Gets information about resources shared with the current user.
   * 
   * @param type - Filter foreign resources by resource type
   * @param chunk - Which segment of the data to return
   * @param reverse - If one, sort descending; otherwise, ascending
   * @param sortBy - Key of the column by which to sort
   * @param filter - Filter foreign resources by file type
   */
  async getForeignResources(
    type: 'folders' | 'files',
    chunk = 0,
    reverse?: 1 | 0,
    sortBy?:
      | 'name'
      | 'size'
      | 'sync'
      | 'date_created'
      | 'date_shared',
    filter?:
      | 'application'
      | 'archive'
      | 'audio'
      | 'development'
      | 'document'
      | 'image'
      | 'presentation'
      | 'spreadsheet'
      | 'video',
  ) {
    return await this.post<MF.DeviceForeignResources>('get_foreign_resources.php', {
      chunk, type, sortBy, reverse, filter,
    });
  }

  /**
   * Returns various information about the status of a device specified by device_id.
   *
   * @param deviceId - The ID of the device. If not passed, it uses the cloud device
   * @param simpleReport - Omits async_jobs_in_progress and async_job_types from the response
   */
  async getStatus(simpleReport = true, deviceId?: number) {
    return await this.post<MF.DeviceStatus>('get_status.php', {
      deviceId, simpleReport,
    });
  }

  /**
   * Returns the trash can folder data and the list of immediate files and folders
   * in the trash can. Contents of subfolders in the trash can will not be returned.
   * 
   * @param chunk - Which segment of the data to return
   * @param contentType - Filter foreign resources by resource type
   * @param deviceId - The ID of the device. If not passed, it uses the cloud device
   */
  async getTrash(
    contentType: 'folders' | 'files',
    chunk = 0,
    deviceId?: number,
  ) {
    return await this.post<MF.DeviceTrash>('get_trash.php', {
      chunk, contentType, deviceId,
    });
  }
}
