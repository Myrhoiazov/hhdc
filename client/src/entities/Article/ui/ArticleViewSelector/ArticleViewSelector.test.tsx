import { fireEvent, render, screen } from '@testing-library/react';
import { ArticleViewSelector } from './ArticleViewSelector';
import { ArticleView } from '../../model/types/article';

describe('ArticleViewSelector', () => {
    test('renders two view buttons', () => {
        render(<ArticleViewSelector view={ArticleView.SMALL} />);
        expect(screen.getAllByRole('button')).toHaveLength(2);
    });

    test('calls onViewClick with the clicked view', () => {
        const onViewClick = jest.fn();
        render(<ArticleViewSelector view={ArticleView.SMALL} onViewClick={onViewClick} />);

        fireEvent.click(screen.getAllByRole('button')[1]);

        expect(onViewClick).toHaveBeenCalledWith(ArticleView.BIG);
    });
});
