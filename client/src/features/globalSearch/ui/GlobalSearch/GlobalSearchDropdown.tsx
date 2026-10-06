import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { classNames } from '@/shared/lib/classNames/classNames';
import { GlobalSearchResponse, SearchCategoryKey } from '../../model/types/globalSearch';
import { FlatResult } from './globalSearchResults';
import cls from './GlobalSearch.module.scss';

const CATEGORY_LABELS: Record<SearchCategoryKey, string> = {
    clients: 'Клиенты',
    payments: 'Платежи',
    groups: 'Группы',
    choreographers: 'Хореографы',
    branches: 'Филиалы',
    transactions: 'Транзакции',
};

interface GlobalSearchDropdownProps {
    loading: boolean;
    data: GlobalSearchResponse | null;
    flatResults: FlatResult[];
    sections: { category: SearchCategoryKey; items: FlatResult[] }[];
    activeIndex: number;
    onHover: (index: number) => void;
    onSelect: (route: string) => void;
}

export const GlobalSearchDropdown = memo((props: GlobalSearchDropdownProps) => {
    const { loading, data, flatResults, sections, activeIndex, onHover, onSelect } = props;
    const { t } = useTranslation();

    return (
        <div className={cls.dropdown}>
            {loading && <div className={cls.state}>{t('Поиск…')}</div>}
            {!loading && flatResults.length === 0 && (
                <div className={cls.state}>{t('Ничего не найдено')}</div>
            )}
            {!loading && sections.map((section) => {
                const total = data?.[section.category]?.total ?? section.items.length;
                const hiddenCount = total - section.items.length;

                return (
                    <div className={cls.section} key={section.category}>
                        <div className={cls.sectionTitle}>{CATEGORY_LABELS[section.category]}</div>
                        {section.items.map((item) => {
                            const globalIndex = flatResults.indexOf(item);
                            return (
                                <button
                                    type="button"
                                    key={item.key}
                                    className={classNames(cls.resultItem, {
                                        [cls.resultItemActive]: globalIndex === activeIndex,
                                    }, [])}
                                    onMouseEnter={() => onHover(globalIndex)}
                                    onClick={() => onSelect(item.route)}
                                >
                                    <span className={cls.resultTitle}>{item.title}</span>
                                    {item.subtitle && (
                                        <span className={cls.resultSubtitle}>{item.subtitle}</span>
                                    )}
                                </button>
                            );
                        })}
                        {hiddenCount > 0 && (
                            <div className={cls.more}>{t('и ещё')} {hiddenCount}</div>
                        )}
                    </div>
                );
            })}
        </div>
    );
});
