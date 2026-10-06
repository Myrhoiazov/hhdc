import webpack from 'webpack';
import { IBuildOptions } from './types/config';

export function buildResolvers(options: IBuildOptions): webpack.ResolveOptions {
    return {
        extensions: ['.tsx', '.ts', '.js'],
        preferAbsolute: true,
        modules: ['node_modules', options.paths.src],
        mainFiles: ['index'],
        alias: {
            '@': options.paths.src,
        },
    };
}
