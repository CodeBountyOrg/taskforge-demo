export default [
  {
    files: ["src/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        Blob: "readonly",
        HTMLElement: "readonly",
        URL: "readonly",
        document: "readonly",
        window: "readonly",
      },
    },
  },
];
