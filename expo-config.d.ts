declare module "expo-config" {
  export interface ExpoConfig {
    name?: string;
    slug?: string;
    version?: string;
    orientation?: "portrait" | "landscape" | "default";
    icon?: string;
    scheme?: string;
    userInterfaceStyle?: "light" | "dark" | "automatic";
    newArchEnabled?: boolean;
    ios?: {
      supportsTablet?: boolean;
      runtimeVersion?: string | { policy: string };
      infoPlist?: Record<string, unknown>;
      [key: string]: unknown;
    };
    android?: {
      adaptiveIcon?: {
        foregroundImage?: string;
        backgroundColor?: string;
      };
      package?: string;
      runtimeVersion?: string;
      [key: string]: unknown;
    };
    web?: {
      bundler?: string;
      output?: string;
      favicon?: string;
      [key: string]: unknown;
    };
    plugins?: (string | [string, unknown] | [string, unknown, unknown])[];
    experiments?: Record<string, unknown>;
    extra?: Record<string, unknown>;
    updates?: {
      url?: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  }

  export interface ConfigContext {
    projectRoot: string;
    config: ExpoConfig;
    pkg: { name: string; version: string } | null;
    exp: ExpoConfig;
  }
}
