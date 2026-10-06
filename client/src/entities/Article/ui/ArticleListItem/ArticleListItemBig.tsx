import { classNames } from '@/shared/lib/classNames/classNames';
import { useTranslation } from 'react-i18next';
import { memo, ReactNode } from 'react';
import { Text } from '@/shared/ui/Text/Text';
import { Card } from '@/shared/ui/Card/Card';
import { Avatar } from '@/shared/ui/Avatar/Avatar';
import { Button, ButtonTheme } from '@/shared/ui/Button/Button';
import cls from './ArticleListItem.module.scss';
import {
    Article,
    ArticleBlockType,
    ArticleTextBlock,
} from '../../model/types/article';
import { ArticleTextBlockComponent } from '../ArticleTextBlockComponent/ArticleTextBlockComponent';

interface ArticleListItemBigProps {
    className?: string;
    article: Article;
    types: ReactNode;
    views: ReactNode;
    onOpenArticle: () => void;
}

export const ArticleListItemBig = memo((props: ArticleListItemBigProps) => {
    const { className, article, types, views, onOpenArticle } = props;
    const { t } = useTranslation();
    const textBlock = article.blocks.find(
        (block) => block.type === ArticleBlockType.TEXT
    ) as ArticleTextBlock;

    return (
        <div className={classNames(cls.ArticleListItem, {}, [className, cls.BIG])}>
            <Card className={cls.card}>
                <div className={cls.header}>
                    <Avatar size={30} src={article.user.avatar} />
                    <Text text={article.user.username} className={cls.username} />
                    <Text text={article.createdAt} className={cls.date} />
                </div>
                <Text title={article.title} className={cls.title} />
                {types}
                <img src={article.img} className={cls.img} alt={article.title} />
                {textBlock && (
                    <ArticleTextBlockComponent block={textBlock} className={cls.textBlock} />
                )}
                <div className={cls.footer}>
                    <Button onClick={onOpenArticle} theme={ButtonTheme.OUTLINE}>
                        {t('Читать далее...')}
                    </Button>
                    {views}
                </div>
            </Card>
        </div>
    );
});