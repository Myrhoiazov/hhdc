// An entity: its types, its requests through shared/api/request, and a public API that names
// every export. Rules of the domain go to model/<rule>.ts with a test once they appear.
const typesFile = ({ component }) => `// What the server returns for this entity. Add the fields the API sends.
export interface ${component} {
    id: string;
}
`;

const apiFile = ({ component, camel }) => `import { readData } from '@/shared/api/request';
import { ${component} } from '../model/types';

// The path is a placeholder: use the route the server defines for this entity.
export const get${component} = async (id: string) => readData<${component}>(\`/${camel}s/\${id}\`);
`;

const indexFile = ({ component, camel }) => `export { get${component} } from './api/${camel}Api';
export type { ${component} } from './model/types';
`;

module.exports = (names) => [
    { path: ['model', 'types.ts'], content: typesFile(names) },
    { path: ['api', `${names.camel}Api.ts`], content: apiFile(names) },
    { path: ['index.ts'], content: indexFile(names) },
];
