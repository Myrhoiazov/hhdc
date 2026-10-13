import { ComponentPropsWithoutRef, createElement } from 'react';
import { classNames } from '@/shared/lib/classNames/classNames';
import cls from './Panel.module.scss';

type PanelTag = 'section' | 'form' | 'article' | 'div' | 'p';

type PanelProps<Tag extends PanelTag> = ComponentPropsWithoutRef<Tag> & {
    // The element the panel is: a `section` unless it is a form or an article.
    as?: Tag;
};

// A block of a page: a bordered surface that stacks what is inside it.
export const Panel = <Tag extends PanelTag = 'section'>({ as, className, ...rest }: PanelProps<Tag>) =>
    createElement(as ?? 'section', { ...rest, className: classNames(cls.Panel, {}, [className]) });
