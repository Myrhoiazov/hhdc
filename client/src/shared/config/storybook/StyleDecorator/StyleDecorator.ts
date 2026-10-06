import { Decorator } from '@storybook/react/*';
import '@/app/styles/index.scss';

export const StyleDecorator = (story: () => Decorator) => story();
