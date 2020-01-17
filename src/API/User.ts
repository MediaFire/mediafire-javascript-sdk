import type * as MF from '../types/User';
import {origin} from '../lib/config';
import {Client} from '../Client';

export class User extends Client {
  constructor () {
    super(`${origin}/api/user/`);
  }

  async getInfo() {
    return await this.post<MF.UserInfo>('get_info.php');
  }

  async getAvatar() {
    return await this.post<MF.UserAvatar>('get_avatar.php');
  }

  async renewSession() {
    return await this.post<MF.UserRenewSession>('renew_session_token.php');
  }
}
