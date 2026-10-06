import { classNames } from '@/shared/lib/classNames/classNames';
import { memo, ReactNode } from 'react';
import { Text } from '@/shared/ui/Text/Text';
import { Card } from '@/shared/ui/Card/Card';
import cls from './ArticleListItem.module.scss';
import { Article } from '../../model/types/article';

interface ArticleListItemSmallProps {
    className?: string;
    article: Article;
    types: ReactNode;
    views: ReactNode;
    onOpenArticle: () => void;
}

export const ArticleListItemSmall = memo((props: ArticleListItemSmallProps) => {
    const { className, article, types, views, onOpenArticle } = props;

    return (
        <div className={classNames(cls.ArticleListItem, {}, [className, cls.SMALL])}>
            <Card className={cls.card} onClick={onOpenArticle}>
                <div className={cls.imageWrapper}>
                    <img alt={article.title} src={article.img} className={cls.img} />
                    <Text text={article.createdAt} className={cls.date} />
                </div>
                <div className={cls.infoWrapper}>
                    {types}
                    {views}
                </div>
                <Text text={article.title} className={cls.title} />
            </Card>
        </div>
    );
});