import * as MF from '../types/File';
import {Client} from '../lib/client';

export class File extends Client {
  constructor (public token?: string) {
    super('file', token);
  }

  /**
   * Returns a list of the file's details.
   * This call will return the quickkey, filename,
   * creation date, description, status, size, etc.
   */
  async getInfo() {
    return await this.post<MF.FileInfo>('get_info.php');
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
  async move() {
    return await this.post<MF.FileMoved>('move.php');
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
   */
  async recentlyModified() {
    return await this.post<MF.FileRecentlyModified>('recently_modified.php');
  }

  /**
   * Download multiple files at once by packaging the files into a ZIP container
   */
  async zip() {
    return await this.post<MF.FileZip>('zip.php');
  }
}
