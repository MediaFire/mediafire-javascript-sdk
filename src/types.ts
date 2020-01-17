// User API

export interface UserInfo {
  ekey: string;
  email: string;
  options: string;
  created: string;
  displayName: string;
  firstName: string;
  lastName: string;
  bandwidth: string;
  validated: boolean;
  premium: boolean;
}

export interface UserAvatar {
  avatar: string;
}

export interface UserRenewSession {
  sessionToken: string;
}
