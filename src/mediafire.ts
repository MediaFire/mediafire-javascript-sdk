import {User} from './api/User';
import {File} from './api/File';
import {Folder} from './api/Folder';
import {Device} from './api/Device';
import {System} from './api/System';

export default class MediaFire {
  constructor (
    public host?: string,
    public user = new User(host),
    public file = new File(host),
    public folder = new Folder(host),
    public device = new Device(host),
    public system = new System(host),
  ) {}

  private _renewal: number;

  public authenticate(token: string, prompt?: Function) {
    this.user = new User(this.host, token);
    this.file = new File(this.host, token);
    this.folder = new Folder(this.host, token);
    this.device = new Device(this.host, token);
    this._renewal = setInterval(async() => {
      try {
        const {sessionToken} = await this.user.renewSession();
        this.authenticate(sessionToken, prompt);
      } catch (e) {
        prompt && prompt(e);
        clearTimeout(this._renewal);
      }
    }, 4 * 60 * 1000);
  }
}
