// A page: the route component inside the CRM frame, loaded lazily. Blocks that only this page
// needs stay in its ui/ folder; hooks and form readers go to model/.
const pageFile = ({ component }) => `import { memo } from 'react';
import { CrmLayout } from '@/widgets/Page';

// The title is an i18n key; add its translations to client/public/locales.
export const ${component} = memo(() => <CrmLayout title="${component.replace(/Page$/, '')}">{null}</CrmLayout>);
`;

const asyncFile = ({ component }) => `import { lazy } from 'react';

export const ${component}Async = lazy(() =>
    import('./${component}').then((module) => ({ default: module.${component} }))
);
`;

const indexFile = ({ component }) => `export { ${component}Async as ${component} } from './ui/${component}.async';
`;

module.exports = (names) => [
    { path: ['ui', `${names.component}.tsx`], content: pageFile(names) },
    { path: ['ui', `${names.component}.async.tsx`], content: asyncFile(names) },
    { path: ['index.ts'], content: indexFile(names) },
];
