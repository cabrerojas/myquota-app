// https://docs.expo.dev/guides/using-eslint/
module.exports = {
  extends: ["expo", "prettier"],
  plugins: ["prettier"],
  rules: {
    "prettier/prettier": "error",
    "expo/use-dom-exports": "off",
  },
  ignorePatterns: ["/dist/*"],
};
