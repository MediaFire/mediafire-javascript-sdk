import {User} from './api/User';
import {File} from './api/File';
import {Folder} from './api/Folder';
import {Device} from './api/Device';
import {System} from './api/System';

export default class MediaFire {
  constructor (
    public user = new User(),
    public file = new File(),
    public folder = new Folder(),
    public device = new Device(),
    public system = new System(),
  ) {}

  public async authenticate(token: string, prompt?: Function) {
    this.user = new User(token);
    this.file = new File(token);
    this.folder = new Folder(token);
    this.device = new Device(token);
    setInterval(async() => {
      try {
        const {sessionToken} = await this.user.renewSession();
        await this.authenticate(sessionToken, prompt);
      } catch (e) {
        prompt && prompt(e);
      }
    }, 4 * 60 * 1000);
  }
}
