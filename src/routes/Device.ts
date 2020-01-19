import * as MF from '../types/User';
import {Client} from '../lib/client';
import {origin} from '../lib/config';

export class Device extends Client {
  constructor () {
    super(`${origin}/api/device/`);
  }

  async getChanges() {
    return await this.post<MF.UserInfo>('get_changes.php');
  }

  async getGetForeignResources() {
    return await this.post<MF.UserInfo>('get_foreign_resources.php');
  }

  async getGetStatus() {
    return await this.post<MF.UserInfo>('get_status.php');
  }

  async getGetTrash() {
    return await this.post<MF.UserInfo>('get_trash.php');
  }
}
