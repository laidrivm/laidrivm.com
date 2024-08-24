import globals from "globals";
import pluginJs from "@eslint/js";
import tsparser from "@typescript-eslint/parser";
import pluginTs from "@typescript-eslint/eslint-plugin";
import pluginReact from "eslint-plugin-react";
import pluginPreact from "eslint-plugin-preact";
import pluginImport from "eslint-plugin-import";
import pluginJSDoc from "eslint-plugin-jsdoc";
import pluginSonarJS from "eslint-plugin-sonarjs";

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
      preact: pluginPreact,
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
      "react/react-in-jsx-scope": "off", // Not needed for Preact
      "react/no-unknown-property": "warn",
      "import/no-unresolved": "error",
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
];
