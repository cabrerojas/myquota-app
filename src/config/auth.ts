import { env } from "./env";

export const googleAuthConfig = {
  iosClientId: env.EXPO_PUBLIC_IOS_CLIENT_ID,
  scopes: ["https://www.googleapis.com/auth/gmail.readonly"],
  webClientId: env.EXPO_PUBLIC_WEB_CLIENT_ID,
} as const;

export const googleAuthRuntimeConfig = {
  redirectPath: "/login",
  storageKeys: {
    codeVerifier: "oauth_code_verifier",
    returnFlag: "oauth_return",
  },
} as const;

export function getGoogleAuthRedirectUri(origin: string): string {
  return `${origin}${googleAuthRuntimeConfig.redirectPath}`;
}

export function buildGoogleAuthUrl(params: {
  codeChallenge: string;
  origin: string;
}): string {
  const redirectUri = getGoogleAuthRedirectUri(params.origin);

  return (
    "https://accounts.google.com/o/oauth2/v2/auth?" +
    new URLSearchParams({
      client_id: googleAuthConfig.webClientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: `openid profile email ${googleAuthConfig.scopes.join(" ")}`,
      code_challenge: params.codeChallenge,
      code_challenge_method: "S256",
      access_type: "offline",
      prompt: "consent",
    }).toString()
  );
}
