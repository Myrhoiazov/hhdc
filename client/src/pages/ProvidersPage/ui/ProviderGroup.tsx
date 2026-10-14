import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { ProviderConnection } from '@/entities/Provider';
import { AiSwitch } from './AiSwitch';
import cls from '@/shared/ui/layout/layout.module.scss';
import { ProviderCard } from './ProviderCard';
import { GROUP_TITLES } from '../model/groups';

export const ProviderGroup = memo(
    ({
        type,
        providers,
        refresh,
    }: {
        type: string;
        providers: ProviderConnection[];
        refresh: () => void;
    }) => {
        const { t } = useTranslation();
        if (!providers.length) return null;
        return (
            <section className={cls.stack} aria-label={t(GROUP_TITLES[type] ?? type)}>
                <h2>{t(GROUP_TITLES[type] ?? type)}</h2>
                {type === 'AI' && <AiSwitch providers={providers} refresh={refresh} />}
                {providers.map((item) => (
                    <ProviderCard key={item.id} provider={item} refresh={refresh} />
                ))}
            </section>
        );
    }
);
