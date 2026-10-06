import { defineConfig } from 'eslint/config';
import * as denysFixFsdPathPlugin from 'eslint-plugin-denys-fix-fsd-path-plugin';
import js from '@eslint/js';
import pluginReactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';
import eslintPluginPrettier from 'eslint-plugin-prettier';
import pluginReact from 'eslint-plugin-react';
import i18next from 'eslint-plugin-i18next';
import globals from 'globals';

export default defineConfig([
    js.configs.recommended,
    tseslint.configs.recommended,
    pluginReact.configs.flat.recommended,
    i18next.configs['flat/recommended'],
    { ignores: ['node_modules/', 'dist/', 'build/', 'scripts/'] },
    {
        files: ['**/*.{js,mjs,cjs,ts,jsx,tsx}'],
        languageOptions: {
            // globals: globals.browser,
            parser: tseslint.parser,
            globals: {
                __IS_DEV__: true,
                __API__: true,
                __PROJECT__: true,
            },
        },
        settings: {
            react: {
                version: 'detect',
            },
        },
        plugins: {
            'denys-fix-fsd-path-plugin': denysFixFsdPathPlugin,
            react: pluginReact,
            'react-hooks': pluginReactHooks,
            prettier: eslintPluginPrettier,
        },

        rules: {
            'react/jsx-indent': [2, 4],
            'react/jsx-indent-props': [2, 4],
            // indent: [2, 4, { SwitchCase: 1 }],
            'react/react-in-jsx-scope': 'off',
            'react/jsx-filename-extension': [2, { extensions: ['.ts', '.tsx'] }],
            'generator-star-spacing': 'off',
            'no-unused-vars': 'off',
            'react/display-name': 'off',
            '@typescript-eslint/no-unused-vars': 'warn',
            '@typescript-eslint/ban-ts-comment': 'warn',
            '@typescript-eslint/no-explicit-any': 'warn',
            'denys-fix-fsd-path-plugin/path-checker': 'error',
            'react-hooks/rules-of-hooks': 'error',
            'react-hooks/exhaustive-deps': 'warn',
            indent: 'off',
        },
    },
    {
        files: ['**/src/**/*.test.{js,ts,jsx,tsx}'],
        rules: {
            'i18next/no-literal-string': 'off',
        },
    },
    {
        files: ['telegram-mini-app/src/**/*.ts'],
        languageOptions: {
            globals: globals.browser,
        },
        rules: {
            // This standalone, Russian-only bundle intentionally does not load the React SPA's
            // i18next runtime or participate in its Feature-Sliced Design import graph.
            'i18next/no-literal-string': 'off',
            'denys-fix-fsd-path-plugin/path-checker': 'off',
        },
    },
    {
        files: ['config/**/*.js'],
        languageOptions: {
            globals: globals.node,
        },
    },
]);
