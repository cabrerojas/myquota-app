// https://docs.expo.dev/guides/using-eslint/
module.exports = {
  extends: ["expo", "prettier"],
  plugins: ["prettier", "@typescript-eslint"],
  parser: "@typescript-eslint/parser",
  rules: {
    "prettier/prettier": "error",
    "expo/use-dom-exports": "off",
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": [
      "error",
      { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
    ],
  },
  ignorePatterns: ["/dist/*"],
};
