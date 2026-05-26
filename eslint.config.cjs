module.exports = [
  {
    files: ["src/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        crypto: "readonly",
        document: "readonly",
        URL: "readonly",
        window: "readonly",
      },
    },
  },
];
