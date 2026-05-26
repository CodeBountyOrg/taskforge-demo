const browserGlobals = {
  crypto: "readonly",
  document: "readonly",
  fetch: "readonly",
  TextEncoder: "readonly",
  URL: "readonly",
  URLSearchParams: "readonly",
  window: "readonly",
};

const nodeGlobals = {
  Buffer: "readonly",
  console: "readonly",
  module: "readonly",
  process: "readonly",
  require: "readonly",
  __dirname: "readonly",
};

export default [
  {
    files: ["server.js", "test/**/*.js"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "commonjs",
      globals: nodeGlobals,
    },
  },
  {
    files: ["src/**/*.js"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      globals: browserGlobals,
    },
  },
];
