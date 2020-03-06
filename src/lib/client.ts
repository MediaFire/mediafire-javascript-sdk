import {GenericRestClient, ApiCallOptions} from 'simplerestclients';
import {buildRequest, buildResponse} from './utils';

export class Client extends GenericRestClient {
  constructor (
    public api: string,
    public host?: string,
    public token?: string,
  ) {
    super(`${host || 'https://www.mediafire.com'}/api/1.5/${api}/`);
  }

  protected _defaultOptions: ApiCallOptions = {
    retries: 3,
    contentType: 'form',
  }

  async post<T>(path: string, props?: object, opts?: ApiCallOptions) {
    const body = {sessionToken: this.token, responseFormat: 'json', ...props};
    const data = this._performApiCall<T>(path, 'POST', buildRequest(body), opts);
    const resp = await data.promise;
    return buildResponse<T>(resp.body);
  }
}
