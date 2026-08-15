import { z } from "zod";

/**
 * Environment configuration schema with Zod validation.
 * All required EXPO_PUBLIC_* variables are validated at module load time.
 */

// Schema definition
const envSchema = z.object({
  // API Configuration
  EXPO_PUBLIC_API_BASE_URL: z.string().url(),

  // App Configuration
  EXPO_PUBLIC_APP_SCHEME: z.string().min(1),

  // EAS / Expo Updates
  EXPO_PUBLIC_EAS_PROJECT_ID: z.string().uuid(),
  EXPO_PUBLIC_EXPO_UPDATES_URL: z.string().url(),

  // Google OAuth (existing vars, kept for backward compat)
  EXPO_PUBLIC_WEB_CLIENT_ID: z.string().min(1),
  EXPO_PUBLIC_IOS_CLIENT_ID: z.string().min(1),

  // Google Sign-In iOS URL Scheme (for Google plugin in app.json/app.config.ts)
  EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME: z.string().min(1),
});

// Type inferred from schema (no manual duplication)
export type Env = z.infer<typeof envSchema>;

/** Singleton validated env instance — throws at module load if vars are missing/invalid */
const parseEnv = (): Env => {
  const result = envSchema.safeParse({
    EXPO_PUBLIC_API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL,
    EXPO_PUBLIC_APP_SCHEME: process.env.EXPO_PUBLIC_APP_SCHEME,
    EXPO_PUBLIC_EAS_PROJECT_ID: process.env.EXPO_PUBLIC_EAS_PROJECT_ID,
    EXPO_PUBLIC_EXPO_UPDATES_URL: process.env.EXPO_PUBLIC_EXPO_UPDATES_URL,
    EXPO_PUBLIC_WEB_CLIENT_ID: process.env.EXPO_PUBLIC_WEB_CLIENT_ID,
    EXPO_PUBLIC_IOS_CLIENT_ID: process.env.EXPO_PUBLIC_IOS_CLIENT_ID,
    EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME:
      process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME,
  });

  if (!result.success) {
    const missing = result.error.issues
      .map((i) => i.path.join("."))
      .join(", ");
    throw new Error(
      `[env.ts] Missing or invalid environment variables: ${missing}\n` +
        `See .env.example for required variables.`
    );
  }

  return result.data;
};

// Validate once at module load — zero overhead on subsequent accesses
export const env = parseEnv();
