import { fireEvent, render, screen } from '@testing-library/react';
import { GroupCard } from './GroupCard';
import { DanceGroup, GroupStatistics } from '@/entities/DanceGroup';

const group: DanceGroup = {
    id: 1,
    name: 'Break dance 6-10',
    style: 'Breakdance',
    level: 'PRO',
    maxParticipants: 20,
    lessonPriceCents: 1500,
    choreographerId: 1,
    choreographer: { id: 1, firstName: 'Ivan', lastName: 'Petrov' },
    branch: { id: 1, name: 'Central', city: 'Kyiv' },
    slots: [{ dayOfWeek: 'Понедельник', startTime: '10:00', endTime: '11:00' }],
    createdAt: '2026-01-01',
};

const statistics: GroupStatistics = {
    id: 1,
    name: 'Break dance 6-10',
    branchId: 1,
    activeCount: 5,
    inactiveCount: 2,
    totalCount: 7,
    activeStudents: [{ id: 1, firstName: 'Petr', lastName: 'Ivanov', isActive: true }],
    inactiveStudents: [{ id: 2, firstName: 'Anna', lastName: 'Sidorova', isActive: false }],
};

describe('GroupCard', () => {
    test('renders the group name, level, style, and choreographer', () => {
        render(<GroupCard group={group} onEdit={() => {}} onDelete={() => {}} />);

        expect(screen.getByText('Break dance 6-10')).toBeInTheDocument();
        expect(screen.getByText('Pro')).toBeInTheDocument();
        expect(screen.getByText('Breakdance · Ivan Petrov')).toBeInTheDocument();
    });

    test('renders the schedule slots with a short day label', () => {
        render(<GroupCard group={group} onEdit={() => {}} onDelete={() => {}} />);
        expect(screen.getByText('Пн 10:00–11:00')).toBeInTheDocument();
    });

    test('renders the active/inactive counts from statistics', () => {
        render(<GroupCard group={group} statistics={statistics} onEdit={() => {}} onDelete={() => {}} />);
        expect(screen.getByText(/5\/20/)).toBeInTheDocument();
        // the i18next mock returns the raw, un-interpolated key
        expect(screen.getByText('Ученики ({{count}})')).toBeInTheDocument();
    });

    test('lists the active and inactive students', () => {
        render(<GroupCard group={group} statistics={statistics} onEdit={() => {}} onDelete={() => {}} />);
        expect(screen.getByText('Petr Ivanov')).toBeInTheDocument();
        expect(screen.getByText('Anna Sidorova')).toBeInTheDocument();
    });

    test('calls onEdit and onDelete', () => {
        const onEdit = jest.fn();
        const onDelete = jest.fn();
        render(<GroupCard group={group} onEdit={onEdit} onDelete={onDelete} />);

        fireEvent.click(screen.getByTitle('Редактировать'));
        fireEvent.click(screen.getByTitle('Удалить'));

        expect(onEdit).toHaveBeenCalledWith(group);
        expect(onDelete).toHaveBeenCalledWith(1);
    });
});
