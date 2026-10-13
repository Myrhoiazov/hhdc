import path from 'path';
import type { StorybookConfig } from '@storybook/react-webpack5';
import { DefinePlugin, RuleSetRule } from 'webpack';
import { buildCssLoaders } from '../build/loaders/buildCssLoaders';

const SRC = path.resolve(__dirname, '..', '..', 'src');

// Storybook's own rule turns an SVG into a file; the application imports it as a component.
const withoutSvg = (rule: RuleSetRule): RuleSetRule =>
    (rule.test instanceof RegExp && rule.test.test('.svg') ? { ...rule, exclude: /\.svg$/i } : rule);

const config: StorybookConfig = {
    stories: ['../../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
    addons: [
        '@storybook/addon-webpack5-compiler-swc',
        '@storybook/addon-essentials',
        '@storybook/addon-onboarding',
        '@storybook/addon-interactions',
    ],
    framework: { name: '@storybook/react-webpack5', options: {} },
    // The stories are built the way the application is: the `@/` alias, SCSS modules, SVG
    // components and the constants webpack defines.
    webpackFinal: async webpackConfig => {
        const rules = (webpackConfig.module?.rules ?? []) as RuleSetRule[];
        return {
            ...webpackConfig,
            resolve: {
                ...webpackConfig.resolve,
                alias: { ...webpackConfig.resolve?.alias, '@': SRC },
            },
            module: {
                ...webpackConfig.module,
                rules: [
                    ...rules.map(withoutSvg),
                    { test: /\.svg$/, use: ['@svgr/webpack'] },
                    buildCssLoaders(true),
                ],
            },
            plugins: [
                ...(webpackConfig.plugins ?? []),
                new DefinePlugin({
                    __IS_DEV__: JSON.stringify(true),
                    __API__: JSON.stringify(''),
                    __PROJECT__: JSON.stringify('storybook'),
                }),
            ],
        };
    },
};

export default config;
