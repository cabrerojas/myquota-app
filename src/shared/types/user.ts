/**
 * User / session interfaces.
 *
 * UserInfo comes from Google Sign-In data stored in AsyncStorage.
 */

export interface UserInfo {
  givenName?: string;
  familyName?: string;
  email?: string;
  photo?: string;
}
