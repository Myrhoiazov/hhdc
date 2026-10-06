import type { Meta, StoryObj } from '@storybook/react';
import { ThemeDecorator } from '@/shared/config/storybook/ThemeDecorator/ThemeDecorator';
import { Theme } from '@/app/providers/ThemeProvider';
import { AppLink, AppLinkTheme } from './AppLink';

const meta = {
    title: 'shared/AppLink',
    component: AppLink,
    args: {
        to: '/',
    },
} satisfies Meta<typeof AppLink>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {};
Primary.args = {
    children: 'Text',
    theme: AppLinkTheme.PRIMARY,
};

export const Secondary: Story = {};
Secondary.args = {
    children: 'Text',
    theme: AppLinkTheme.SECONDARY,
};

export const Red: Story = {};
Red.args = {
    children: 'Text',
    theme: AppLinkTheme.RED,
};

export const PrimaryDark: Story = {};
PrimaryDark.args = {
    children: 'Text',
    theme: AppLinkTheme.PRIMARY,
};
PrimaryDark.decorators = [ThemeDecorator(Theme.DARK)];

export const SecondaryDark: Story = {};
SecondaryDark.args = {
    children: 'Text',
    theme: AppLinkTheme.SECONDARY,
};
SecondaryDark.decorators = [ThemeDecorator(Theme.DARK)];

export const RedDark: Story = {};
RedDark.args = {
    children: 'Text',
    theme: AppLinkTheme.RED,
};
RedDark.decorators = [ThemeDecorator(Theme.DARK)];
