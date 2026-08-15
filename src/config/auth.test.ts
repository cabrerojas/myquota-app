const REQUIRED_ENV = {
  EXPO_PUBLIC_API_BASE_URL: "https://api.myquota.app",
  EXPO_PUBLIC_APP_SCHEME: "myquota",
  EXPO_PUBLIC_EAS_PROJECT_ID: "123e4567-e89b-42d3-a456-426614174000",
  EXPO_PUBLIC_EXPO_UPDATES_URL:
    "https://u.expo.dev/11111111-1111-1111-1111-111111111111",
  EXPO_PUBLIC_WEB_CLIENT_ID: "web-client-id.apps.googleusercontent.com",
  EXPO_PUBLIC_IOS_CLIENT_ID: "ios-client-id.apps.googleusercontent.com",
  EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME: "com.googleusercontent.apps.ios-client-id",
} as const;

function loadAuthModule() {
  const previousEnv = { ...process.env };
  Object.assign(process.env, REQUIRED_ENV);

  let authModule: typeof import("./auth") | undefined;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    authModule = require("./auth") as typeof import("./auth");
  });

  process.env = previousEnv;
  return authModule!;
}

describe("auth config", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("builds the web redirect URI from the configured login path", () => {
    const { getGoogleAuthRedirectUri } = loadAuthModule();

    expect(getGoogleAuthRedirectUri("https://myquota.app")).toBe(
      "https://myquota.app/login",
    );
  });

  it("builds the Google OAuth URL from centralized config", () => {
    const { buildGoogleAuthUrl } = loadAuthModule();
    const authUrl = buildGoogleAuthUrl({
      origin: "https://myquota.app",
      codeChallenge: "challenge-123",
    });
    const parsedUrl = new URL(authUrl);

    expect(parsedUrl.origin + parsedUrl.pathname).toBe(
      "https://accounts.google.com/o/oauth2/v2/auth",
    );
    expect(parsedUrl.searchParams.get("client_id")).toBe(
      REQUIRED_ENV.EXPO_PUBLIC_WEB_CLIENT_ID,
    );
    expect(parsedUrl.searchParams.get("redirect_uri")).toBe(
      "https://myquota.app/login",
    );
    expect(parsedUrl.searchParams.get("code_challenge")).toBe("challenge-123");
    expect(parsedUrl.searchParams.get("scope")).toContain(
      "https://www.googleapis.com/auth/gmail.readonly",
    );
  });
});
