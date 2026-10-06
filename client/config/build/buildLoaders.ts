import webpack from 'webpack';
import { IBuildOptions } from './types/config';
import { buildCssLoaders } from './loaders/buildCssLoaders';
import { buildBabelLoader } from './loaders/buildBabelLoader';

export function buildLoaders(options: IBuildOptions): webpack.RuleSetRule[] {
    const svgLoader = {
        test: /\.svg$/,
        use: ['@svgr/webpack'],
    };

    const fileLoader = {
        test: /\.(png|jpe?g|gif|woff2?|eot|ttf)$/,
        use: [
            {
                loader: 'file-loader',
            },
        ],
    };

    const cssLoader = buildCssLoaders(options.isDev);
    const babelLoader = buildBabelLoader(options);

    const typescriptLoader = {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
    };


    return [svgLoader, fileLoader, babelLoader, typescriptLoader, cssLoader];
}
