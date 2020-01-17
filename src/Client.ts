import {GenericRestClient, ApiCallOptions} from 'simplerestclients';
import {buildRequest, buildResponse} from './lib/utils';
import {origin} from './lib/config';

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
