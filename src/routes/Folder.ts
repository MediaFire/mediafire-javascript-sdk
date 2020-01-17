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

  async getDepth() {
    return await this.post<MF.UserInfo>('get_depth.php');
  }

  async getContent() {
    return await this.post<MF.UserInfo>('getContent.php');
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

  async configureFiledrop() {
    return await this.post<MF.UserInfo>('configure_filedrop.php');
  }

  async search() {
    return await this.post<MF.UserInfo>('search.php');
  }
}
