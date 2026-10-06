import type { Meta, StoryObj } from '@storybook/react';
import { Button, ButtonTheme } from './Button';
import { ThemeDecorator } from '@/shared/config/storybook/ThemeDecorator/ThemeDecorator';
import { Theme } from '@/shared/const/theme';

const meta = {
    title: 'shared/Button',
    component: Button,
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Outline: Story = {
    args: {
        children: 'Text',
        theme: ButtonTheme.OUTLINE,
    },
};

export const OutlineDark: Story = {
    args: {
        children: 'Text',
        theme: ButtonTheme.OUTLINE,
    },
};
OutlineDark.decorators = [ThemeDecorator(Theme.DARK)];

export const Clear: Story = {
    args: {
        children: 'Text',
        theme: ButtonTheme.CLEAR,
    },
};
