module.exports = {
  globDirectory: "dist",
  swDest: "dist/sw.js",
  globPatterns: ["**/*.{html,js,css,png,json,woff2}"],
  clientsClaim: true,
  skipWaiting: true,
};
