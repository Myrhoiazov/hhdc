import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { classNames } from '@/shared/lib/classNames/classNames';
import { Tabs, TabItem } from '@/shared/ui/Tabs';
import { $apiPrivate } from '@/shared/api/api';

interface ClientTypeTabsProps {
    className?: string;
    value: string;
    onChangeType: (type: string) => void;
}

interface Branch {
    id: number;
    name: string;
    isActive?: boolean;
}

export const ClientTypeTabs = memo((props: ClientTypeTabsProps) => {
    const { className, value, onChangeType } = props;
    const [branches, setBranches] = useState<Branch[]>([]);

    useEffect(() => {
        $apiPrivate.get<Branch[]>('/company/branches')
            .then(({ data }) => {
                setBranches(data.filter((branch) => branch.isActive !== false));
            })
            .catch(() => {
                setBranches([]);
            });
    }, []);

    const typeTabs = useMemo<TabItem[]>(
        () => [
            {
                value: 'all',
                content: 'Все филиалы',
            },
            ...branches.map((branch) => ({
                value: String(branch.id),
                content: branch.name,
            })),
        ],
        [branches]
    );

    const onTabClick = useCallback(
        (tab: TabItem) => {
            onChangeType(tab.value);
        },
        [onChangeType]
    );

    return (
        <Tabs
            direction="row"
            tabs={typeTabs}
            value={value}
            onTabClick={onTabClick}
            className={classNames('', {}, [className])}
        />
    );
});
