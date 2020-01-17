import {GenericRestClient, ApiCallOptions} from 'simplerestclients';
import {buildRequest, buildResponse} from './utils';
import {origin} from './config';

export class Client extends GenericRestClient {
  constructor (private _token: string) {
    super(`${origin}/api/`);
  }

  protected _defaultOptions: ApiCallOptions = {
    retries: 3,
    contentType: 'form',
  }

  async post<T>(path: string, props?: object, opts?: ApiCallOptions) {
    const body = {sessionToken: this._token, responseFormat: 'json', ...props};
    const data = await this._performApiCall<T>(path, 'POST', buildRequest(body), opts);
    return buildResponse<T>(data);
  }
}
