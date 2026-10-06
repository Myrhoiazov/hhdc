import { EntityState } from '@reduxjs/toolkit';
import { Article, ArticleView } from '@/entities/Article';

export interface ArticlePageSchema extends EntityState<Article, string> {
    isLoading?: boolean;
    error?: string;

    view: ArticleView;
    // for pagination
    page: number;
    limit?: number;
    hasMore: boolean;

    _inited: boolean
}
