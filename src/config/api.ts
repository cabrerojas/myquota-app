import { env } from "./env";

/**
 * API base URL for backend requests.
 * Externalized via EXPO_PUBLIC_API_BASE_URL in .env.
 * Validated at module load by src/config/env.ts.
 */
export const API_BASE_URL = env.EXPO_PUBLIC_API_BASE_URL;
