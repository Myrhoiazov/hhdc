// A widget or a feature: one component with its own styles, opened through index.ts.
const componentFile = ({ component }) => `import { memo } from 'react';
import { classNames } from '@/shared/lib/classNames/classNames';
import cls from './${component}.module.scss';

interface ${component}Props {
    className?: string;
}

export const ${component} = memo(({ className }: ${component}Props) => (
    <div className={classNames(cls.${component}, {}, [className])} />
));
`;

const styleFile = ({ component }) => `.${component} {
    display: flex;
    flex-direction: column;
    gap: 16px;
}
`;

const indexFile = ({ component }) => `export { ${component} } from './ui/${component}/${component}';
`;

module.exports = (names) => [
    { path: ['ui', names.component, `${names.component}.tsx`], content: componentFile(names) },
    { path: ['ui', names.component, `${names.component}.module.scss`], content: styleFile(names) },
    { path: ['index.ts'], content: indexFile(names) },
];
