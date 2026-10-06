import { fireEvent, render, screen } from '@testing-library/react';
import { Tabs } from './Tabs';

const tabs = [
    { value: 'one', content: 'One' },
    { value: 'two', content: 'Two' },
];

describe('Tabs', () => {
    test('renders all tabs', () => {
        render(<Tabs tabs={tabs} value="one" onTabClick={() => {}} />);
        expect(screen.getByText('One')).toBeInTheDocument();
        expect(screen.getByText('Two')).toBeInTheDocument();
    });

    test('marks the active tab as selected', () => {
        render(<Tabs tabs={tabs} value="one" onTabClick={() => {}} />);

        const activeTab = screen.getByText('One').closest('[class*="tab"]') as HTMLElement;
        const inactiveTab = screen.getByText('Two').closest('[class*="tab"]') as HTMLElement;

        expect(activeTab.className).toMatch(/selected/);
        expect(inactiveTab.className).not.toMatch(/selected/);
    });

    test('calls onTabClick with the clicked tab', () => {
        const onTabClick = jest.fn();
        render(<Tabs tabs={tabs} value="one" onTabClick={onTabClick} />);

        fireEvent.click(screen.getByText('Two'));

        expect(onTabClick).toHaveBeenCalledWith(tabs[1]);
    });
});
