import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import type { GroupStatistics, GroupStudent } from '@/entities/DanceGroup';
import s from './GroupCard.module.scss';

const studentName = (student: GroupStudent) => (
    [student.firstName, student.lastName].filter(Boolean).join(' ') || student.email || `Ученик #${student.id}`
);

interface GroupCardStudentsProps {
    statistics?: GroupStatistics;
}

export const GroupCardStudents = memo(function GroupCardStudents({ statistics }: GroupCardStudentsProps) {
    const { t } = useTranslation();
    const active = statistics?.activeStudents ?? [];
    const inactive = statistics?.inactiveStudents ?? [];

    return (
        <details className={s.students}>
            <summary>
                {t('Ученики ({{count}})', { count: statistics?.totalCount ?? 0 })}
            </summary>
            <div className={s.studentColumns}>
                <div>
                    <strong>{t('Активные ({{count}})', { count: statistics?.activeCount ?? 0 })}</strong>
                    {active.length ? (
                        <ul>
                            {active.map((student) => (
                                <li key={student.id}>{studentName(student)}</li>
                            ))}
                        </ul>
                    ) : <span className={s.noStudents}>{t('Нет учеников')}</span>}
                </div>
                <div>
                    <strong>{t('Неактивные ({{count}})', { count: statistics?.inactiveCount ?? 0 })}</strong>
                    {inactive.length ? (
                        <ul>
                            {inactive.map((student) => (
                                <li key={student.id}>{studentName(student)}</li>
                            ))}
                        </ul>
                    ) : <span className={s.noStudents}>{t('Нет учеников')}</span>}
                </div>
            </div>
        </details>
    );
});
