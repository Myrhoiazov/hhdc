import { render, screen } from '@testing-library/react';
import { ArticleCodeBlockComponent } from './ArticleCodeBlockComponent';
import { ArticleBlockType, ArticleCodeBlock } from '../../model/types/article';

describe('ArticleCodeBlockComponent', () => {
    test('renders the code text', () => {
        const block: ArticleCodeBlock = { id: '1', type: ArticleBlockType.CODE, code: 'const x = 1;' };
        render(<ArticleCodeBlockComponent block={block} />);

        expect(screen.getByText('const x = 1;')).toBeInTheDocument();
    });
});
