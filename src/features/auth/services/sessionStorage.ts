import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { UserInfo } from "@/shared/types/user";

const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";
const USER_KEY = "user";

/**
 * Secure storage wrapper — uses expo-secure-store on native,
 * falls back to localStorage on web (SecureStore is native-only).
 */
const secureStore = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === "web") {
      return localStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === "web") {
      localStorage.setItem(key, value);
      return;
    }
    return SecureStore.setItemAsync(key, value);
  },
  async deleteItem(key: string): Promise<void> {
    if (Platform.OS === "web") {
      localStorage.removeItem(key);
      return;
    }
    return SecureStore.deleteItemAsync(key);
  },
};

type SessionPayload = {
  accessToken?: string;
  refreshToken?: string;
  user?: UserInfo;
};

export async function persistSession(payload: SessionPayload): Promise<void> {
  const operations: Promise<void>[] = [];

  if (payload.accessToken) {
    operations.push(
      secureStore.setItem(ACCESS_TOKEN_KEY, payload.accessToken),
    );
  }

  if (payload.refreshToken) {
    operations.push(
      secureStore.setItem(REFRESH_TOKEN_KEY, payload.refreshToken),
    );
  }

  if (payload.user) {
    operations.push(
      secureStore.setItem(USER_KEY, JSON.stringify(payload.user)),
    );
  }

  await Promise.all(operations);
}

export async function clearSession(): Promise<void> {
  await Promise.all([
    secureStore.deleteItem(ACCESS_TOKEN_KEY),
    secureStore.deleteItem(REFRESH_TOKEN_KEY),
    secureStore.deleteItem(USER_KEY),
    AsyncStorage.multiRemove(["jwt", "user", "pendingAction"]),
  ]);
}

export async function getAccessToken(): Promise<string | null> {
  let token = await secureStore.getItem(ACCESS_TOKEN_KEY);

  if (!token) {
    const legacyToken = await AsyncStorage.getItem("jwt");
    if (legacyToken) {
      await secureStore.setItem(ACCESS_TOKEN_KEY, legacyToken);
      await AsyncStorage.removeItem("jwt");
      token = legacyToken;
    }
  }

  return token;
}

export async function getRefreshToken(): Promise<string | null> {
  return secureStore.getItem(REFRESH_TOKEN_KEY);
}

export async function getSessionUser(): Promise<UserInfo | null> {
  const secureUser = await secureStore.getItem(USER_KEY);
  if (secureUser) {
    return JSON.parse(secureUser) as UserInfo;
  }

  const legacyUser = await AsyncStorage.getItem("user");
  if (!legacyUser) return null;

  await secureStore.setItem(USER_KEY, legacyUser);
  await AsyncStorage.removeItem("user");
  return JSON.parse(legacyUser) as UserInfo;
}
