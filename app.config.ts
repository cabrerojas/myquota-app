import type { ExpoConfig, ConfigContext } from "expo-config";

/**
 * Dynamic Expo app configuration (app.config.ts)
 * Reads from EXPO_PUBLIC_* environment variables.
 *
 * IMPORTANT: All EXPO_PUBLIC_* vars are injected at build time by Expo.
 * For local development, ensure .env is present (see .env.example).
 */
const defineConfig = (ctx: ConfigContext): ExpoConfig => {
  // Validate env vars at build time
  const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  const appScheme = process.env.EXPO_PUBLIC_APP_SCHEME;
  const easProjectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  const expoUpdatesUrl = process.env.EXPO_PUBLIC_EXPO_UPDATES_URL;
  const googleIosUrlScheme = process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME;

  if (!apiBaseUrl || !appScheme || !easProjectId || !expoUpdatesUrl || !googleIosUrlScheme) {
    throw new Error(
      "[app.config.ts] Missing required environment variables. " +
        "Copy .env.example to .env and fill in all values."
    );
  }

  return {
    name: "myquota-app",
    slug: "myquota-app",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: appScheme,
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      runtimeVersion: {
        policy: "appVersion",
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#ffffff",
      },
      package: "cl.cabrerojas.myquota",
      runtimeVersion: "1.0.0",
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png",
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
        },
      ],
      [
        "@react-native-google-signin/google-signin",
        {
          iosUrlScheme: googleIosUrlScheme,
        },
      ],
      "@react-native-community/datetimepicker",
      [
        "expo-notifications",
        {
          icon: "./assets/images/icon.png",
          color: "#007BFF",
        },
      ],
      "expo-secure-store",
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      router: {
        origin: false,
      },
      eas: {
        projectId: easProjectId,
      },
    },
    updates: {
      url: expoUpdatesUrl,
    },
  };
};

export default defineConfig;
