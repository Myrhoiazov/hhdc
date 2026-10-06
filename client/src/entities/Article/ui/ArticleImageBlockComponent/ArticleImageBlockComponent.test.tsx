import { render, screen } from '@testing-library/react';
import { ArticleImageBlockComponent } from './ArticleImageBlockComponent';
import { ArticleBlockType, ArticleImageBlock } from '../../model/types/article';

describe('ArticleImageBlockComponent', () => {
    test('renders the image with its title as alt text', () => {
        const block: ArticleImageBlock = { id: '1', type: ArticleBlockType.IMAGE, src: '/img.png', title: 'A picture' };
        render(<ArticleImageBlockComponent block={block} />);

        expect(screen.getByAltText('A picture')).toHaveAttribute('src', '/img.png');
    });

    test('renders the caption text when a title is given', () => {
        const block: ArticleImageBlock = { id: '1', type: ArticleBlockType.IMAGE, src: '/img.png', title: 'A picture' };
        render(<ArticleImageBlockComponent block={block} />);

        expect(screen.getByText('A picture')).toBeInTheDocument();
    });
});
