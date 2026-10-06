import type { Meta, StoryObj } from '@storybook/react';
import { ThemeDecorator } from '@/shared/config/storybook/ThemeDecorator/ThemeDecorator';
import { Theme } from '@/app/providers/ThemeProvider';
import ErrorPage from './ErrorPage';

const meta = {
    title: 'widgets/ErrorPage',
    component: ErrorPage,
} satisfies Meta<typeof ErrorPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Light: Story = {};
Light.args = {};

export const Dark: Story = {};
Dark.args = {};
Dark.decorators = [ThemeDecorator(Theme.DARK)];
