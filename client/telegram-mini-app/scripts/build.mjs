import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const clientRoot = resolve(packageRoot, '..');
const repoRoot = resolve(clientRoot, '..');
const sourceRoot = resolve(packageRoot, 'src');

const targetFlag = process.argv.indexOf('--target');
const target = targetFlag >= 0 ? process.argv[targetFlag + 1] : 'both';
if (!['client', 'server', 'both'].includes(target)) {
    throw new Error(`Unknown build target: ${target}`);
}

const tokenNames = [
    'primary-redesigned',
    'primary-hover-redesigned',
    'primary-contrast-redesigned',
    'primary-soft-bg-redesigned',
    'sidebar-bg-redesigned',
    'sidebar-border-redesigned',
    'sidebar-text-redesigned',
    'sidebar-text-hover-redesigned',
    'sidebar-hover-bg-redesigned',
    'sidebar-group-label-redesigned',
    'card-border-redesigned',
    'success-bg-redesigned',
    'success-text-redesigned',
    'danger-bg-redesigned',
    'danger-text-redesigned',
];

const radiusNames = [
    'radius-sm-redesigned',
    'radius-md-redesigned',
    'radius-lg-redesigned',
    'radius-pill-redesigned',
];

const readTokens = async (file, names) => {
    const source = await readFile(file, 'utf8');
    return names.map((name) => {
        const match = source.match(new RegExp(`--${name}:\\s*([^;]+);`));
        if (!match) throw new Error(`Missing design token --${name} in ${file}`);
        return `    --${name}: ${match[1].trim()};`;
    });
};

const defaultTokens = await readTokens(
    resolve(clientRoot, 'src/app/styles/themes/default.scss'),
    tokenNames,
);
const darkTokens = await readTokens(
    resolve(clientRoot, 'src/app/styles/themes/dark.scss'),
    tokenNames,
);
const radiusTokens = await readTokens(
    resolve(clientRoot, 'src/app/styles/variables/global.scss'),
    radiusNames,
);
const layoutCss = await readFile(resolve(sourceRoot, 'app.css'), 'utf8');
const css = `:root {\n${[...defaultTokens, ...radiusTokens].join('\n')}\n}\n\n.app_dark_theme {\n${darkTokens.join('\n')}\n}\n\n${layoutCss}`;
const cssHash = createHash('sha256').update(css).digest('hex').slice(0, 10);
const cssName = `app-${cssHash}.css`;

const destinations = [
    ...(target === 'client' || target === 'both'
        ? [resolve(clientRoot, 'build/telegram-admin')]
        : []),
    ...(target === 'server' || target === 'both'
        ? [resolve(repoRoot, 'server/public/telegram-admin')]
        : []),
];

const temporaryOutput = resolve(packageRoot, '.build');
await rm(temporaryOutput, { recursive: true, force: true });
await mkdir(temporaryOutput, { recursive: true });
const buildResult = await build({
    entryPoints: [resolve(sourceRoot, 'main.ts')],
    bundle: true,
    minify: true,
    format: 'iife',
    platform: 'browser',
    target: ['es2020'],
    entryNames: 'app-[hash]',
    outdir: temporaryOutput,
    metafile: true,
});
const jsOutput = Object.keys(buildResult.metafile.outputs).find((file) => file.endsWith('.js'));
if (!jsOutput) throw new Error('esbuild did not produce a JavaScript bundle');
const jsName = jsOutput.split('/').at(-1);
const htmlTemplate = await readFile(resolve(sourceRoot, 'index.html'), 'utf8');
const html = htmlTemplate.replace('__APP_CSS__', cssName).replace('__APP_JS__', jsName);

for (const destination of destinations) {
    await rm(destination, { recursive: true, force: true });
    await mkdir(destination, { recursive: true });
    await cp(resolve(temporaryOutput, jsName), resolve(destination, jsName));
    await writeFile(resolve(destination, cssName), css);
    await writeFile(resolve(destination, 'index.html'), html);
}
await rm(temporaryOutput, { recursive: true, force: true });

console.log(`Telegram Mini App built for ${target}: ${jsName}, ${cssName}`);
