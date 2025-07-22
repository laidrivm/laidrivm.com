import globals from "globals";
import pluginJs from "@eslint/js";
import tsparser from "@typescript-eslint/parser";
import pluginTs from "@typescript-eslint/eslint-plugin";
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
        tsconfigRootDir: process.cwd(),
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
      jsdoc: pluginJSDoc,
      sonarjs: pluginSonarJS,
    },
    settings: {
      'import/parsers': {
        '@typescript-eslint/parser': ['.ts', '.tsx']
      },
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: './tsconfig.json',
          extensions: ['.js', '.jsx', '.ts', '.tsx'],
        },
        node: {
          extensions: ['.js', '.jsx', '.ts', '.tsx']
        }
      }
    },
    rules: {
      "no-unused-vars": "warn",
      "no-undef": "off",
      "no-mixed-spaces-and-tabs": "off",
      "no-case-declarations": "off",
      "no-extra-semi": "off",
      "sonarjs/cognitive-complexity": "off",
      "sonarjs/no-all-duplicated-branches": "off",
      "import/no-unresolved": ["error", { "ignore": ["octokit"] }],
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
        tsconfigRootDir: process.cwd(),
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
    settings: {
      'import/parsers': {
        '@typescript-eslint/parser': ['.ts', '.tsx']
      },
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: './tsconfig.json',
          extensions: ['.js', '.jsx', '.ts', '.tsx'],
        },
        node: {
          extensions: ['.js', '.jsx', '.ts', '.tsx']
        }
      }
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
    ignores: ["example/*", "test/**/*"],
  },
  cssPlugin.configs["flat/recommended"],
];
