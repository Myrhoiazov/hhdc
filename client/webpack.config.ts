import webpack from 'webpack';
import path from 'path';
import { buildWebpackConfig } from './config/build/buildWebpackConfig';
import { IBuildEnv, IBuildPath } from './config/build/types/config';

export default (env: IBuildEnv) => {
    try {
        process.loadEnvFile(path.resolve(__dirname, '..', '.env'));
    } catch {
        // .env отсутствует (например, при Docker-сборке) — все необходимые
        // переменные приходят из окружения вызывающей стороны (build args).
    }

    const paths: IBuildPath = {
        entry: path.resolve(__dirname, 'src', 'index.tsx'),
        build: path.resolve(__dirname, 'build'),
        html: path.resolve(__dirname, 'public', 'index.html'),
        src: path.resolve(__dirname, 'src'),
        locales: path.resolve(__dirname, 'public', 'locales'),
        buildLocales: path.resolve(__dirname, 'build', 'locales'),
        favicon: path.resolve(__dirname, 'public', 'favicon'),
        buildFavicon: path.resolve(__dirname, 'build', 'favicon'),
    };

    const PORT = env.port || 3000;
    const mode = env.mode || 'development';
    const isDev = mode === 'development';
    let apiUrl = process.env.CLIENT_API_URL;
    if (!apiUrl) {
        if (isDev) {
            apiUrl = 'http://localhost:8080';
        } else {
            throw new Error('CLIENT_API_URL не задан — укажите его в корневом .env или через переменные окружения / Docker build arg.');
        }
    }

    const config: webpack.Configuration = buildWebpackConfig({
        mode,
        paths,
        isDev,
        port: PORT,
        apiUrl,
        project: 'frontend',
    });

    return config;
};
