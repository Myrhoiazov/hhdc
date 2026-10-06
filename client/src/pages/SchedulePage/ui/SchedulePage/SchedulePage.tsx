import { memo, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Page } from '@/widgets/Page/Page';
import { DanceGroup } from '@/entities/DanceGroup';
import { personName, startOfWeek } from '../../lib/scheduleUtils';
import { ScheduleGrid } from './ScheduleGrid';
import { ScheduleSummary } from './ScheduleSummary';
import { ScheduleToolbar } from './ScheduleToolbar';
import { useScheduleGroups } from './useScheduleGroups';
import s from './SchedulePage.module.scss';

const SchedulePage = memo(() => {
    const { t } = useTranslation();
    const { groups, loading } = useScheduleGroups();
    const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
    const [choreographer, setChoreographer] = useState('');
    const [style, setStyle] = useState('');
    const [branch, setBranch] = useState('');
    const [day, setDay] = useState('');

    const filteredGroups = useMemo(() => (groups as DanceGroup[]).filter((group) => (
        (!choreographer || personName(group) === choreographer)
        && (!style || group.style === style)
        && (!branch || group.branch?.name === branch)
        && (!day || group.slots.some((slot) => slot.dayOfWeek === day))
    )), [branch, choreographer, day, groups, style]);

    return (
        <Page>
            <div className={s.header}>
                <h1>{t('Расписание')}</h1>
            </div>

            <ScheduleToolbar
                groups={groups}
                weekStart={weekStart}
                onChangeWeekStart={setWeekStart}
                choreographer={choreographer}
                onChangeChoreographer={setChoreographer}
                style={style}
                onChangeStyle={setStyle}
                branch={branch}
                onChangeBranch={setBranch}
                day={day}
                onChangeDay={setDay}
            />
            <ScheduleSummary weekStart={weekStart} filteredGroups={filteredGroups} />
            <ScheduleGrid filteredGroups={filteredGroups} loading={loading} weekStart={weekStart} />
        </Page>
    );
});

export default SchedulePage;