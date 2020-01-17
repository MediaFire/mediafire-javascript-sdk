import {Client} from '../Client';
import {origin} from '../config';
import * as API from '../types';

export class Folder extends Client {
  constructor () {
    super(`${origin}/api/folder/`);
  }

  async getInfo() {
    return await this.post<API.UserInfo>('get_info.php');
  }
}
