import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { ArticleListItem } from './ArticleListItem';
import { Article, ArticleBlockType, ArticleType, ArticleView } from '../../model/types/article';
import { RoleKey } from '@/entities/Role';

const article: Article = {
    id: '1',
    title: 'My article',
    subtitle: 'Subtitle',
    img: '/img.png',
    views: 42,
    createdAt: '2026-01-15',
    type: [ArticleType.IT],
    user: { id: '1', username: 'denis', email: 'd@example.com', role: RoleKey.ADMIN },
    blocks: [{ id: '1', type: ArticleBlockType.TEXT, paragraphs: ['Text'] }],
};

function renderItem(view: ArticleView) {
    return render(
        <MemoryRouter>
            <ArticleListItem article={article} view={view} />
        </MemoryRouter>,
    );
}

describe('ArticleListItem', () => {
    test('renders the title and view count in the BIG view', () => {
        renderItem(ArticleView.BIG);
        expect(screen.getByText('My article')).toBeInTheDocument();
        expect(screen.getByText('42')).toBeInTheDocument();
    });

    test('renders a "read more" button in the BIG view', () => {
        renderItem(ArticleView.BIG);
        expect(screen.getByRole('button', { name: 'Читать далее...' })).toBeInTheDocument();
    });

    test('renders the title in the SMALL (tile) view', () => {
        renderItem(ArticleView.SMALL);
        expect(screen.getByText('My article')).toBeInTheDocument();
    });

    test('opening the card in the SMALL view does not throw', () => {
        const { container } = renderItem(ArticleView.SMALL);
        expect(() => fireEvent.click(container.querySelector('.card')!)).not.toThrow();
    });
});
