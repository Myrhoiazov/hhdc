import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { CommentList } from './CommentList';
import { Comment } from '../../model/types/comment';

const comments: Comment[] = [
    { id: '1', text: 'First', author: { id: '1', firstName: 'Ivan' } } as Comment,
    { id: '2', text: 'Second', author: { id: '2', firstName: 'Petr' } } as Comment,
];

function renderList(props: Partial<React.ComponentProps<typeof CommentList>> = {}) {
    return render(
        <MemoryRouter>
            <CommentList {...props} />
        </MemoryRouter>,
    );
}

describe('CommentList', () => {
    test('renders every comment', () => {
        renderList({ comments });
        expect(screen.getByText('First')).toBeInTheDocument();
        expect(screen.getByText('Second')).toBeInTheDocument();
    });

    test('shows a placeholder message when there are no comments', () => {
        renderList({ comments: [] });
        expect(screen.getByText('Комментарии отсутствуют')).toBeInTheDocument();
    });
});
