import { ThemeDecorator } from '@/shared/config/storybook/ThemeDecorator/ThemeDecorator';
import { Sidebar } from './Sidebar';
import { Meta, StoryObj } from '@storybook/react';
import { Theme } from '@/shared/const/theme';

export default {
    title: 'widgets/Sidebar',
    component: Sidebar,
} as Meta<typeof Sidebar>;

export const Light: StoryObj<typeof Sidebar> = {};

export const Dark: StoryObj<typeof Sidebar> = {};
Dark.decorators = [ThemeDecorator(Theme.DARK)];
