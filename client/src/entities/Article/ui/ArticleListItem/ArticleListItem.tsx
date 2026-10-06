import { memo, useCallback } from 'react';
import { Text } from '@/shared/ui/Text/Text';
import { Icon } from '@/shared/ui/Icon/Icon';
import EyeIcon from '@/shared/assets/icons/eye-20-20.svg';
import { useNavigate } from 'react-router-dom';
import { RoutePath } from '@/shared/config/routeConfig/routeConfig';
import cls from './ArticleListItem.module.scss';
import { Article, ArticleView } from '../../model/types/article';
import { ArticleListItemBig } from './ArticleListItemBig';
import { ArticleListItemSmall } from './ArticleListItemSmall';

interface ArticleListItemProps {
    className?: string;
    article: Article;
    view: ArticleView;
}

export const ArticleListItem = memo((props: ArticleListItemProps) => {
    const { className, article, view } = props;
    const navigate = useNavigate();

    const onOpenArticle = useCallback(() => {
        navigate(RoutePath.article_details + article.id);
    }, [article.id, navigate]);

    const types = <Text text={article.type.join(', ')} className={cls.types} />;
    const views = (
        <>
            <Text text={String(article.views)} className={cls.views} />
            <Icon Svg={EyeIcon} />
        </>
    );

    if (view === ArticleView.BIG) {
        return (
            <ArticleListItemBig
                className={className}
                article={article}
                types={types}
                views={views}
                onOpenArticle={onOpenArticle}
            />
        );
    }

    return (
        <ArticleListItemSmall
            className={className}
            article={article}
            types={types}
            views={views}
            onOpenArticle={onOpenArticle}
        />
    );
});