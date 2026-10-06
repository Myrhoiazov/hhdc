import { Decorator } from '@storybook/react/*';
import { Theme } from '@/shared/const/theme';

export const ThemeDecorator = (theme: Theme): Decorator => (Story, context) => {
    return (
        <div className={`app ${theme}`}>
            <Story {...context} />
        </div>
    );
};
