import * as MF from '../types/User';
import {Client} from '../lib/client';
import {origin} from '../lib/config';

export class Folder extends Client {
  constructor () {
    super(`${origin}/api/folder/`);
  }

  async getInfo() {
    return await this.post<MF.UserInfo>('get_info.php');
  }
}
