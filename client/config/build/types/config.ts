export type BuildMode = 'development' | 'production';

export interface IBuildPath {
    entry: string;
    build: string;
    html: string;
    src: string;
    locales: string;
    buildLocales: string;
    favicon: string
    buildFavicon: string
}
export interface IBuildEnv {
    mode: BuildMode;
    port: number;
    apiUrl: string
}
export interface IBuildOptions {
    mode: BuildMode;
    paths: IBuildPath;
    isDev: boolean;
    port: number;
    apiUrl: string,
    project: 'storybook' | 'frontend' | 'jest';
}
