import type { Preview } from '@storybook/react'
// The styles of the application belong to its top layer, so the stories take them here, not through `shared`.
import '../../src/app/styles/index.scss';
import { ThemeDecorator } from '../../src/shared/config/storybook/ThemeDecorator/ThemeDecorator';
import { RouterDecorator } from '../../src/shared/config/storybook/RouterDecorator/RouterDecorator';
import { Theme } from '../../src/shared/const/theme';

const preview: Preview = {
    parameters: {
        controls: {
            matchers: {
                color: /(background|color)$/i,
                date: /Date$/i,
            },
        },
    },
    decorators: [ThemeDecorator(Theme.LIGHT), RouterDecorator],
};

export default preview;