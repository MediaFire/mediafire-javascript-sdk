import * as MF from '../types/User';
import {Client} from '../lib/client';
import {origin} from '../lib/config';

export class System extends Client {
  constructor () {
    super(`${origin}/api/system/`);
  }

  async getLimits() {
    return await this.post<MF.UserInfo>('get_limits.php');
  }
}
