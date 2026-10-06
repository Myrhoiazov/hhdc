import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { CommentCard } from './CommentCard';
import { Comment } from '../../model/types/comment';

const comment: Comment = {
    id: '1',
    text: 'Hello there',
    createdAt: '2026-01-15T10:00:00.000Z',
    author: { id: '2', firstName: 'Ivan' },
} as Comment;

function renderCard(props: Partial<React.ComponentProps<typeof CommentCard>> = {}) {
    return render(
        <MemoryRouter>
            <CommentCard comment={comment} {...props} />
        </MemoryRouter>,
    );
}

describe('CommentCard', () => {
    test('renders the comment text and author name', () => {
        renderCard();
        expect(screen.getByText('Hello there')).toBeInTheDocument();
        expect(screen.getByText('Ivan')).toBeInTheDocument();
    });

    test('links to the author profile', () => {
        renderCard();
        const link = screen.getByText('Ivan').closest('a');
        expect(link).toHaveAttribute('href', expect.stringContaining('2'));
    });

    test('renders skeletons while loading instead of the comment content', () => {
        renderCard({ isLoading: true });
        expect(screen.queryByText('Hello there')).not.toBeInTheDocument();
    });
});
