import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Text } from '@/shared/ui/Text/Text';
import cls from './ClientForm.module.scss';

interface DanceGroup {
    id: number;
    name: string;
    style: string;
    level: string;
    branchId?: number | null;
}

interface ClientFormGroupsSectionProps {
    availableGroups: DanceGroup[];
    selectedGroupIds: number[];
    onToggleGroup: (groupId: number) => void;
}

export const ClientFormGroupsSection = memo((props: ClientFormGroupsSectionProps) => {
    const { availableGroups, selectedGroupIds, onToggleGroup } = props;
    const { t } = useTranslation();

    return (
        <div className={cls.groupSection}>
            <Text size="s" title={t('Группы филиала')} bold />
            {availableGroups.length ? (
                <div className={cls.groupOptions}>
                    {availableGroups.map((group) => (
                        <label key={group.id} className={cls.groupOption}>
                            <input
                                type="checkbox"
                                checked={selectedGroupIds.includes(group.id)}
                                onChange={() => onToggleGroup(group.id)}
                            />
                            <span><strong>{group.name}</strong><small>{group.style} · {group.level}</small></span>
                        </label>
                    ))}
                </div>
            ) : <Text size="s" text={t('В выбранном филиале пока нет доступных групп.')} />}
        </div>
    );
});
