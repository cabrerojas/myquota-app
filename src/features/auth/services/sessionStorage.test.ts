import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import {
  clearSession,
  getAccessToken,
  getSessionUser,
  persistSession,
} from "./sessionStorage";

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  multiRemove: jest.fn(),
}));

describe("sessionStorage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("persists tokens and user in SecureStore", async () => {
    await persistSession({
      accessToken: "access-1",
      refreshToken: "refresh-1",
      user: { givenName: "Gonzalo", email: "test@myquota.app" },
    });

    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      "accessToken",
      "access-1",
    );
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      "refreshToken",
      "refresh-1",
    );
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      "user",
      JSON.stringify({ givenName: "Gonzalo", email: "test@myquota.app" }),
    );
  });

  it("returns secure access token directly when available", async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue("secure-token");

    const token = await getAccessToken();

    expect(token).toBe("secure-token");
    expect(AsyncStorage.getItem).not.toHaveBeenCalled();
  });

  it("migrates legacy jwt from AsyncStorage to SecureStore", async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue("legacy-token");

    const token = await getAccessToken();

    expect(token).toBe("legacy-token");
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      "accessToken",
      "legacy-token",
    );
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith("jwt");
  });

  it("migrates legacy user profile from AsyncStorage to SecureStore", async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
      JSON.stringify({ givenName: "Legacy" }),
    );

    const user = await getSessionUser();

    expect(user).toEqual({ givenName: "Legacy" });
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      "user",
      JSON.stringify({ givenName: "Legacy" }),
    );
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith("user");
  });

  it("clears secure and legacy session keys", async () => {
    await clearSession();

    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith("accessToken");
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith("refreshToken");
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith("user");
    expect(AsyncStorage.multiRemove).toHaveBeenCalledWith([
      "jwt",
      "user",
      "pendingAction",
    ]);
  });
});
