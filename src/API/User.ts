import {Client} from '../Client';
import {origin} from '../config';
import * as API from '../types';

export class User extends Client {
  constructor () {
    super(`${origin}/api/user/`);
  }

  async getInfo() {
    return await this.post<API.UserInfo>('get_info.php');
  }

  async getAvatar() {
    return await this.post<API.UserAvatar>('get_avatar.php');
  }

  async renewSession() {
    return await this.post<API.UserRenewSession>('renew_session_token.php');
  }
}
