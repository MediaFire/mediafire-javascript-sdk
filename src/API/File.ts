import type * as MF from '../types/User';
import {origin} from '../lib/config';
import {Client} from '../Client';

export class File extends Client {
  constructor () {
    super(`${origin}/api/file/`);
  }

  async getInfo() {
    return await this.post<MF.UserInfo>('get_info.php');
  }
}
