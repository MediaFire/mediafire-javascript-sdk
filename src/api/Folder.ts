import * as MF from '../types/Folder';
import {Client} from '../lib/client';

export class Folder extends Client {
  constructor (public host?: string, public token?: string) {
    super('folder', host, token);
  }

  /**
   * Returns a list of a folder's details.
   * 
   * @param folderKey - The key of the folder you wish to load
   */
  async getInfo(folderKey: string, details?: 'no' | 'yes' | 'shallow') {
    return await this.post<MF.FolderInfo>('get_info.php', {folderKey, details});
  }

  /**
   * Specifies how deep in the folder structure, how far from root, the target folder is.
   * The number of levels deep is returned with a list of "chain folders" which
   * illustrate the direct path from root to the target folder.
   * 
   * @param folderKey - The key of the folder you wish to load the depth of
   */
  async getDepth(folderKey: string) {
    return await this.post<MF.FolderDepth>('get_depth.php', {folderKey});
  }

  /**
   * Returns a collection of top-level folders or files for target folder.
   * 
   * @param folderKey - The key of the folder you wish to load the contents for
   * @param contentType - Specifies the type of content to return
   * @param chunk - Specifies which segment of the results to return starting from one
   * @param chunkSize - The number of items to include in each chunk returned (0-1000)
   * @param orderDirection - Whether to sort ascending or descending
   * @param orderBy - Key of the column by which to sort
   * @param filter - Filter by privacy and/or by filetype
   */
  async getContent(
    folderKey: string,
    contentType: 'folders' | 'files',
    chunk = 0,
    chunkSize = 100,
    details?: 'no' | 'yes' | 'shallow',
    orderDirection?: 'asc' | 'desc',
    orderBy?:
      | 'name'
      | 'size'
      | 'created'
      | 'downloads',
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
    return await this.post<MF.FolderContent>('get_content.php', {
      folderKey, contentType, chunk, chunkSize, details, orderDirection, orderBy, filter,
    });
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
  async move(folderKeySrc: string, folderKeyDst: string) {
    return await this.post<MF.FolderMoved>('move.php', {
      folderKeySrc, folderKeyDst,
    });
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
   * 
   * @param folderKey - The key of the folder you wish to load the depth of.
   * @param searchText - The search keywords to look for in filenames, folder names, and descriptions.
   * @param searchAll - If folder_key is passed, then this parameter is ignored. If folder_key is not passed, search_all can be used to indicate whether to search the root folder only or the entire device (default 'yes').
   * @param details - If "yes", the API returns the total_files, total_folders, and total_size for all the contained folders and files recursively of each folder. However, there is a limit on how many items can be counted. If the limit is reached, an extra property overflow will be returned as well. If "shallow" is specified, the API returns the byte_count of files immediately inside each folder (non-recursive).
   * @param filter - Filter by privacy and/or by filetype. This is a comma-separated list of file types and privacy options. Can take one or more of the following values : "public", "private", "image", "video", "audio", "document", "spreadsheet", "presentation", "application", "archive", "data", and "development".
   */
  async search(
    folderKey: string,
    searchText: string,
    searchAll = true,
    details?:
      | 'no'
      | 'yes'
      | 'shallow',
    filter?:
      | 'public'
      | 'private'
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
    return await this.post<MF.FolderSearch>('search.php', {
      folderKey,
      searchText,
      searchAll,
      details,
      filter,
    });
  }
}
