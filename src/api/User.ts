import * as MF from '../types/User';
import {Client} from '../lib/client';

export class User extends Client {
  constructor (public host?: string, public token?: string) {
    super('user', host, token);
  }

  /**
   * Returns a list of the user's personal information and account vitals.
   */
  async getInfo() {
    return await this.post<MF.UserInfo>('get_info.php');
  }

  /**
   * Returns the URL of the session user's avatar image.
   */
  async getAvatar() {
    return await this.post<MF.UserAvatar>('get_avatar.php');
  }

  /**
   * Extends the life of the session token by another 10 minutes.
   * If the session token is less than 5 minutes old, then it
   * does not get renewed and the same token is returned.
   * If the token is more than 5 minutes old, then, depending
   * on the application configuration, the token gets extended
   * or a new token is generated and returned.
   */
  async renewSession() {
    return await this.post<MF.UserRenewSession>('renew_session_token.php');
  }
}
