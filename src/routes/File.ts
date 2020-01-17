import * as MF from '../types/User';
import {Client} from '../lib/client';
import {origin} from '../lib/config';

export class File extends Client {
  constructor () {
    super(`${origin}/api/file/`);
  }

  async getInfo() {
    return await this.post<MF.UserInfo>('get_info.php');
  }

  async getLinks() {
    return await this.post<MF.UserInfo>('get_info.php');
  }

  async update() {
    return await this.post<MF.UserInfo>('update.php');
  }

  async move() {
    return await this.post<MF.UserInfo>('move.php');
  }

  async copy() {
    return await this.post<MF.UserInfo>('copy.php');
  }

  async delete() {
    return await this.post<MF.UserInfo>('delete.php');
  }

  async purge() {
    return await this.post<MF.UserInfo>('purge.php');
  }

  async recentlyModified() {
    return await this.post<MF.UserInfo>('recently_modified.php');
  }

  async zip() {
    return await this.post<MF.UserInfo>('zip.php');
  }
}
