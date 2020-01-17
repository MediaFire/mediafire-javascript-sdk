import type * as MF from '../types/User';
import {origin} from '../config';
import {Client} from '../Client';

export class System extends Client {
  constructor () {
    super(`${origin}/api/system/`);
  }

  async getInfo() {
    return await this.post<MF.UserInfo>('get_info.php');
  }
}
