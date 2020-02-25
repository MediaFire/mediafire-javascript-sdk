import * as MF from '../types/System';
import {Client} from '../lib/client';

export class System extends Client {
  constructor (public host?: string, public token?: string) {
    super('system', host, token);
  }

  /**
   * Returns the current state of the cloud infrastructure.
   */
  async getStatus() {
    return await this.post<MF.SystemStatus>('get_status.php');
  }

  /**
   * Returns a list of various limits that the API honors.
   */
  async getLimits() {
    return await this.post<MF.SystemLimits>('get_limits.php');
  }
}
