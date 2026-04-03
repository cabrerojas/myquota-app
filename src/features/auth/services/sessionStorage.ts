import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { UserInfo } from "@/shared/types/user";

const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";
const USER_KEY = "user";

type SessionPayload = {
  accessToken?: string;
  refreshToken?: string;
  user?: UserInfo;
};

export async function persistSession(payload: SessionPayload): Promise<void> {
  const operations: Promise<void>[] = [];

  if (payload.accessToken) {
    operations.push(
      SecureStore.setItemAsync(ACCESS_TOKEN_KEY, payload.accessToken),
    );
  }

  if (payload.refreshToken) {
    operations.push(
      SecureStore.setItemAsync(REFRESH_TOKEN_KEY, payload.refreshToken),
    );
  }

  if (payload.user) {
    operations.push(
      SecureStore.setItemAsync(USER_KEY, JSON.stringify(payload.user)),
    );
  }

  await Promise.all(operations);
}

export async function clearSession(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
    SecureStore.deleteItemAsync(USER_KEY),
    AsyncStorage.multiRemove(["jwt", "user", "pendingAction"]),
  ]);
}

export async function getAccessToken(): Promise<string | null> {
  let token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);

  if (!token) {
    const legacyToken = await AsyncStorage.getItem("jwt");
    if (legacyToken) {
      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, legacyToken);
      await AsyncStorage.removeItem("jwt");
      token = legacyToken;
    }
  }

  return token;
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function getSessionUser(): Promise<UserInfo | null> {
  const secureUser = await SecureStore.getItemAsync(USER_KEY);
  if (secureUser) {
    return JSON.parse(secureUser) as UserInfo;
  }

  const legacyUser = await AsyncStorage.getItem("user");
  if (!legacyUser) return null;

  await SecureStore.setItemAsync(USER_KEY, legacyUser);
  await AsyncStorage.removeItem("user");
  return JSON.parse(legacyUser) as UserInfo;
}
