// @ts-check
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");
const prettierConfig = require("eslint-config-prettier");
const prettierPlugin = require("eslint-plugin-prettier");

module.exports = defineConfig([
  // Expo base config (includes TypeScript, React, import rules)
  ...expoConfig,

  // Prettier formatting
  prettierConfig,
  {
    plugins: { prettier: prettierPlugin },
    rules: {
      "prettier/prettier": "error",
    },
  },

  // Project-specific rules
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },

  // Ignore patterns
  {
    ignores: ["dist/", "android/", "ios/", ".expo/"],
  },
]);
