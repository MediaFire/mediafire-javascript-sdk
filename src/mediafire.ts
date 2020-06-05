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

  public authenticate(token: string) {
    this.user = new User(this.host, token);
    this.file = new File(this.host, token);
    this.folder = new Folder(this.host, token);
    this.device = new Device(this.host, token);
  }
}
