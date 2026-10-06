import { Meta, StoryObj } from '@storybook/react';
import { ThemeDecorator } from '@/shared/config/storybook/ThemeDecorator/ThemeDecorator';
import { Theme } from '@/app/providers/ThemeProvider';
import { Navbar } from './Navbar';

export default {
    title: 'widget/Navbar',
    component: Navbar,
} as Meta<typeof Navbar>;

export const Light: StoryObj<typeof Navbar> = {};

export const Dark: StoryObj<typeof Navbar> = {};
Dark.decorators = [ThemeDecorator(Theme.DARK)];
