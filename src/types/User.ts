/**
 * #### [[User.getInfo]] API Response
 */
export interface UserInfo {
  userInfo: {
    /**
     * The email address of the user
     */
    email: string;
    /**
     * Information about the user
     */
    options: number;
    /**
     * The date the account was created
     */
    created: string;
    /**
     * The display name of the user
     */
    displayName: string;
    /**
     * The first name of the user
     */
    firstName: string;
    /**
     * The last name of the user
     */
    lastName: string;
    /**
     * Indicates whether or not the user has validated their account
     */
    validated: boolean;
    /**
     * Whether or not the user is a premium user
     */
    premium: boolean;
    /**
     * An alternate form of the session user's ID used for authentication
     * Only returned if this API was called with SSL
     */
    ekey?: string;
  }
}

export interface UserAvatar {
  /**
   * The avatar URL for the user
   */
  avatar: string;
}

export interface UserRenewSession {
  /**
   * The new, or refreshed, session token
   */
  sessionToken: string;
}
