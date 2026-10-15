import { render, screen } from '@testing-library/react';
import { MailBadge } from './MailBadge';

test.each(['incoming', 'sent', 'client', 'new', 'opened', 'review'] as const)(
    'a %s badge takes the colour of its tone',
    (tone) => {
        render(<MailBadge tone={tone}>Label</MailBadge>);

        expect(screen.getByText('Label')).toHaveClass('MailBadge', tone);
    }
);
