const prettier = require("eslint-config-prettier");
const prettierPlugin = require("eslint-plugin-prettier");
const unusedImports = require("eslint-plugin-unused-imports");
const { defineConfig } = require("eslint/config");

module.exports = defineConfig([
  {
    ignores: [
      "dist/*",
      "node_modules",
      "build",
      "bin",
      "pnpm-lock.yaml",
    ],
  },
  prettier,
  {
    plugins: {
      prettier: prettierPlugin,
      "unused-imports": unusedImports,
    },
    rules: {
      "prettier/prettier": "error",
      "unused-imports/no-unused-imports": "error",
      "no-console": "warn",
      "react/display-name": "off",
    },
  },
]);
