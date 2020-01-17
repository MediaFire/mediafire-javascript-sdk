import {GenericRestClient, ApiCallOptions} from 'simplerestclients';
import {buildResponse, buildRequest} from '../utils';
import {MEDIAFIRE} from '../config';
import * as API from '../types';

export class User extends GenericRestClient {
  constructor (private _token: string) {
    super(`${MEDIAFIRE}/api/user/`);
  }

  async getInfo() {
    const data = await this.performApiPost<API.UserInfo>('get_info.php', this._init());
    return buildResponse(data);
  }

  async getAvatar() {
    const data = await this.performApiPost<API.UserAvatar>('get_avatar.php', this._init());
    return buildResponse(data);
  }

  async renewSession() {
    const data = await this.performApiPost<API.UserRenewSession>('renew_session_token.php', this._init());
    return buildResponse(data);
  }

  protected _opts() {return {response_format: 'json', session_token: this._token}};
  protected _init(e?: object) {return {...this._opts(), ...(e ? buildRequest(e) : {})}}
  protected _defaultOptions: ApiCallOptions = {
    contentType: 'form',
    retries: 5,
  };
}
