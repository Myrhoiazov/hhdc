import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { ArticleList } from './ArticleList';
import { Article, ArticleBlockType, ArticleType, ArticleView } from '../../model/types/article';
import { RoleKey } from '@/entities/Role';

function makeArticle(id: string, title: string): Article {
    return {
        id,
        title,
        subtitle: '',
        img: '/img.png',
        views: 1,
        createdAt: '2026-01-15',
        type: [ArticleType.IT],
        user: { id: '1', username: 'denis', email: 'd@example.com', role: RoleKey.ADMIN },
        blocks: [{ id: '1', type: ArticleBlockType.TEXT, paragraphs: ['Text'] }],
    };
}

function renderList(props: Partial<React.ComponentProps<typeof ArticleList>> & { articles: Article[] }) {
    return render(
        <MemoryRouter>
            <ArticleList {...props} />
        </MemoryRouter>,
    );
}

describe('ArticleList', () => {
    test('renders an ArticleListItem for each article', () => {
        renderList({ articles: [makeArticle('1', 'First'), makeArticle('2', 'Second')] });

        expect(screen.getByText('First')).toBeInTheDocument();
        expect(screen.getByText('Second')).toBeInTheDocument();
    });

    test('renders 9 skeletons for the SMALL view while loading', () => {
        const { container } = renderList({ articles: [], isLoading: true, view: ArticleView.SMALL });
        expect(container.querySelectorAll('.ArticleListItem')).toHaveLength(9);
    });

    test('renders 3 skeletons for the BIG view while loading', () => {
        const { container } = renderList({ articles: [], isLoading: true, view: ArticleView.BIG });
        expect(container.querySelectorAll('.ArticleListItem')).toHaveLength(3);
    });
});
