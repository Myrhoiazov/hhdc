import { memo } from 'react';
import { Text } from '@/shared/ui/Text/Text';
import { Avatar } from '@/shared/ui/Avatar/Avatar';
import EyeIcon from '@/shared/assets/icons/eye-20-20.svg';
import CalendarIcon from '@/shared/assets/icons/calendar-20-20.svg';
import { Icon } from '@/shared/ui/Icon/Icon';
import { ArticleCodeBlockComponent } from '@/entities/Article/ui/ArticleCodeBlockComponent/ArticleCodeBlockComponent';
import { ArticleImageBlockComponent } from '@/entities/Article/ui/ArticleImageBlockComponent/ArticleImageBlockComponent';
import { ArticleTextBlockComponent } from '@/entities/Article/ui/ArticleTextBlockComponent/ArticleTextBlockComponent';
import { Article, ArticleBlock, ArticleBlockType } from '../../model/types/article';
import cls from './ArticleDetails.module.scss';

interface ArticleDetailsContentProps {
    article?: Article;
}

function renderArticleBlock(block: ArticleBlock) {
    switch (block.type) {
    case ArticleBlockType.CODE:
        return (
            <ArticleCodeBlockComponent key={block.id} block={block} className={cls.block} />
        );
    case ArticleBlockType.IMAGE:
        return (
            <ArticleImageBlockComponent
                key={block.id}
                block={block}
                className={cls.block}
            />
        );
    case ArticleBlockType.TEXT:
        return (
            <ArticleTextBlockComponent key={block.id} className={cls.block} block={block} />
        );
    default:
        return null;
    }
}

export const ArticleDetailsContent = memo((props: ArticleDetailsContentProps) => {
    const { article } = props;

    return (
        <>
            <div className={cls.avatarWrapper}>
                <Avatar size={200} src={article?.img} className={cls.avatar} />
            </div>
            <Text
                className={cls.title}
                title={article?.title}
                text={article?.subtitle}
                size={'m'}
            />
            <div className={cls.articleInfo}>
                <Icon className={cls.icon} Svg={EyeIcon} />
                <Text text={String(article?.views)} />
            </div>
            <div className={cls.articleInfo}>
                <Icon className={cls.icon} Svg={CalendarIcon} />
                <Text text={article?.createdAt} />
            </div>
            {article?.blocks.map(renderArticleBlock)}
        </>
    );
});