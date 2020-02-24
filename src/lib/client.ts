import {GenericRestClient, ApiCallOptions} from 'simplerestclients';
import {buildRequest, buildResponse} from './utils';

export class Client extends GenericRestClient {
  protected static ORIGIN = 'https://www.mediafire.com';

  constructor (public api: string, public token?: string) {
    super(`${Client.ORIGIN}/api/${api}/`);
  }

  protected _defaultOptions: ApiCallOptions = {
    retries: 3,
    contentType: 'form',
  }

  async post<T>(path: string, props?: object, opts?: ApiCallOptions) {
    const body = {sessionToken: this.token, responseFormat: 'json', ...props};
    const data = await this._performApiCall<T>(path, 'POST', buildRequest(body), opts);
    return buildResponse<T>(data.body);
  }
}
