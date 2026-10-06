/**
 * For a detailed explanation regarding each configuration property, visit:
 * https://jestjs.io/docs/configuration
 */

import type { Config } from 'jest';
import path from 'path';

const config: Config = {
    clearMocks: true,
    testEnvironment: "jsdom",
    coveragePathIgnorePatterns: [
        "/node_modules/"
    ],
    moduleDirectories: [
        "node_modules"
    ],
    modulePaths: [
        "<rootDir>/src"
    ],
    moduleFileExtensions: [
        "js",
        "mjs",
        "cjs",
        "jsx",
        "ts",
        "tsx",
        "json",
        "node"
    ],
    rootDir: '../../',
    roots: [
        "<rootDir>"
    ],
    testMatch: [
        "<rootDir>/src/**/*(*.)@(test|spec).[tj]s?(x)"
    ],
    setupFilesAfterEnv: [
        "<rootDir>/config/jest/setupTests.ts"
    ],
    moduleNameMapper: {
        '\\.(s?css)$': 'identity-obj-proxy',
        '\\.svg': path.resolve(__dirname, 'jestEnptyComponent.tsx'),
        '\\.(png|jpe?g|gif|webp|avif)$': path.resolve(__dirname, 'fileMock.js'),
        '^react-i18next$': '<rootDir>/config/jest/__mocks__/react-i18next.ts',
        '^@/(.*)$': '<rootDir>/src/$1',
    },
    globals: {
        __IS_DEV__: true,
        __API__: '',
        __PROJECT__: 'jest',
    },
};

export default config;
