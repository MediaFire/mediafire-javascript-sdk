import * as MF from '../types/File';
import {Client} from '../lib/client';

export class File extends Client {
  constructor (public host?: string, public token?: string) {
    super('file', host, token);
  }

  /**
   * Returns a list of the file's details.
   * This call will return the quickkey, filename,
   * creation date, description, status, size, etc.
   * 
   * @param quickKey - The quickkey that identifies the file.
   * You can also specify multiple quickkeys separated by commas.
   * The maximum number of quickkeys allowed is 500.
   * Responses for one-time keys will not include quickkey.
   */
  async getInfo(quickKey: string) {
    return await this.post<MF.FileInfo>('get_info.php', {quickKey});
  }

  /**
   * Updates a file's information.
   */
  async update() {
    return await this.post<MF.FileUpdated>('update.php');
  }

  /**
   * Moves one or more files from one location to another
   */
  async move(quickKey: string, folderKey: string) {
    return await this.post<MF.FileMoved>('move.php', {
      quickKey, folderKey,
    });
  }

  /**
   * Copies one or more files from one location to another
   */
  async copy() {
    return await this.post<MF.FileCopied>('copy.php');
  }

  /**
   * Deletes one or more session user files by setting the
   * files' deleteDate property and moving the files to the trash can.
   * The file is still accessible in the trash can
   */
  async delete() {
    return await this.post<MF.FileDeleted>('delete.php');
  }

  /**
   * Permanently deletes one or more files
   */
  async purge() {
    return await this.post<MF.FilePurged>('purge.php');
  }

  /**
   * Returns a list of quickkeys of the recently modified files
   * 
   * @param numberOfFiles - Indicates the number of quickkeys to be returned. 10 (default)
   */
  async recentlyModified(numberOfFiles: number) {
    return await this.post<MF.FileRecentlyModified>('recently_modified.php', {
      numberOfFiles,
    });
  }

  /**
   * Download multiple files at once by packaging the files into a ZIP container
   */
  async zip() {
    return await this.post<MF.FileZip>('zip.php');
  }
}
