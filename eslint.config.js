import globals from "globals";
import pluginJs from "@eslint/js";
import tsparser from "@typescript-eslint/parser";
import pluginTs from "@typescript-eslint/eslint-plugin";
import pluginReact from "eslint-plugin-react";
import pluginImport from "eslint-plugin-import";
import pluginJSDoc from "eslint-plugin-jsdoc";
import pluginSonarJS from "eslint-plugin-sonarjs";
import cssPlugin from "eslint-plugin-css"

export default [
  {
    files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
        project: "./tsconfig.json",
      },
      globals: {
        ...globals.browser,
        JSX: true,
        Bun: true,
        process: true,
      },
    },
    plugins: {
      "@typescript-eslint": pluginTs,
      react: pluginReact,
      import: pluginImport,
      jsdoc: pluginJSDoc,
      sonarjs: pluginSonarJS,
    },
    rules: {
      "no-unused-vars": "warn",
      "no-undef": "off",
      "no-mixed-spaces-and-tabs": "off",
      "no-case-declarations": "off",
      "no-extra-semi": "off",
      "sonarjs/cognitive-complexity": "off",
      "sonarjs/no-all-duplicated-branches": "off",
      "react/no-unknown-property": ["error", { "ignore": ["onclick", "onsubmit", "onchange"] }],
      "import/no-unresolved": ["error", { "ignore": ["octokit"] }], // Ignore 'octokit' module because of https://github.com/octokit/octokit.js?tab=readme-ov-file#usage
      "import/order": ["warn", { "newlines-between": "always" }],
      "jsdoc/check-alignment": "warn",
      "jsdoc/check-indentation": "warn",
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/explicit-module-boundary-types": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-inferrable-types": "warn",
      "@typescript-eslint/consistent-type-imports": "warn",
    },
  },
  // Test files configuration
  {
    files: ["**/*.test.{js,ts,jsx,tsx}", "**/*.spec.{js,ts,jsx,tsx}"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
        project: "./tsconfig.json",
      },
      globals: {
        ...globals.browser,
        JSX: true,
        Bun: true,
        process: true,
      },
    },
    plugins: {
      "@typescript-eslint": pluginTs,
      import: pluginImport,
    },
    rules: {
      // Relax rules for test files
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "import/no-unresolved": ["error", { 
        "ignore": ["octokit", "bun:test", "bun:*"] 
      }],
      // Allow console in tests
      "no-console": "off",
    },
  },
  pluginJs.configs.recommended,
  {
    settings: {
      react: {
        version: "18.2.0",
      },
    },
  },
  {
    ignores: ["example/*", "test/**/*"],
  },
  cssPlugin.configs["flat/recommended"],
];