import * as MF from '../types/Folder';
import {Client} from '../lib/client';

export class Folder extends Client {
  constructor (public token?: string) {
    super('folder', token);
  }

  /**
   * Returns a list of a folder's details.
   */
  async getInfo() {
    return await this.post<MF.FolderInfo>('get_info.php');
  }

  /**
   * Specifies how deep in the folder structure, how far from root, the target folder is.
   * The number of levels deep is returned with a list of "chain folders" which
   * illustrate the direct path from root to the target folder.
   */
  async getDepth() {
    return await this.post<MF.FolderDepth>('get_depth.php');
  }

  /**
   * Returns a collection of top-level folders or files for target folder.
   */
  async getContent() {
    return await this.post<MF.FolderContent>('get_content.php');
  }

  /**
   * Updates a folder's information.
   */
  async update() {
    return await this.post<MF.FolderUpdated>('update.php');
  }

  /**
   * Move one or more user's folders to target destination.
   */
  async move() {
    return await this.post<MF.FolderMoved>('move.php');
  }

  /**
   * Copies a session user's folder and its children to a target destination.
   */
  async copy() {
    return await this.post<MF.FolderCopied>('copy.php');
  }

  /**
   * Deletes one or more session user's folders by moving them and their
   * contents into the trash and setting their delete dates.
   */
  async delete() {
    return await this.post<MF.FolderDeleted>('delete.php');
  }

  /**
   * Deletes one or more of a session user's folders permanently,
   * along with all contents of the folders, by removing their entries from the database.
   * THIS OPTION CANNOT BE UNDONE.
   */
  async purge() {
    return await this.post<MF.FolderPurged>('purge.php');
  }

  /**
   * Activates, or deactivates, a folder as a file drop.
   * Alternatively, updates the folder's file drop configuration.
   */
  async configureFiledrop() {
    return await this.post<MF.FolderConfiguredFiledrop>('configure_filedrop.php');
  }

  /**
   * Searches the the content of a given folder.
   */
  async search() {
    return await this.post<MF.FolderSearch>('search.php');
  }
}
