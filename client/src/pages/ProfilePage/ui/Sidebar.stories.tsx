import { ThemeDecorator } from '@/shared/config/storybook/ThemeDecorator/ThemeDecorator';
import ProfilePage from './ProfilePage';
import { Meta, StoryObj } from '@storybook/react';
import { Theme } from '@/shared/const/theme';

export default {
    title: 'page/ProfilePage',
    component: ProfilePage,
} as Meta<typeof ProfilePage>;

export const Light: StoryObj<typeof ProfilePage> = {};

export const Dark: StoryObj<typeof ProfilePage> = {};
Dark.decorators = [ThemeDecorator(Theme.DARK)];
