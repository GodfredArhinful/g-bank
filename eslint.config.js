import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores(["**/node_modules/", "**/dist/", "coverage/"]),
  js.configs.recommended,
  tseslint.configs.recommended,
  prettier,
  {
    rules: {
      // Express error handlers need 4 parameters even when one is unused; prefix it with _.
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
]);
