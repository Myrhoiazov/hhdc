import { ChangeEvent, KeyboardEvent, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { classNames } from '@/shared/lib/classNames/classNames';
import { GlobalSearchDropdown } from './GlobalSearchDropdown';
import { useGlobalSearchState } from './useGlobalSearchState';
import type { FlatResult } from './globalSearchResults';
import { GlobalSearchResponse, SearchCategoryKey } from '../../model/types/globalSearch';
import cls from './GlobalSearch.module.scss';

export type { FlatResult } from './globalSearchResults';

interface SearchPanelProps {
    inputRef: React.RefObject<HTMLInputElement | null>;
    query: string;
    onChangeQuery: (event: ChangeEvent<HTMLInputElement>) => void;
    onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
    closeSearch: () => void;
    showDropdown: boolean;
    loading: boolean;
    data: GlobalSearchResponse | null;
    flatResults: FlatResult[];
    sections: { category: SearchCategoryKey; items: FlatResult[] }[];
    activeIndex: number;
    onHover: (index: number) => void;
    onSelect: (route: string) => void;
}

const SearchPanel = (props: SearchPanelProps) => {
    const {
        inputRef, query, onChangeQuery, onKeyDown, closeSearch, showDropdown,
        loading, data, flatResults, sections, activeIndex, onHover, onSelect,
    } = props;
    const { t } = useTranslation();

    return (
        <div className={cls.panel}>
            <div className={cls.inputRow}>
                <span className={cls.icon}>{t('⌕')}</span>
                <input
                    ref={inputRef} type="text" className={cls.input}
                    placeholder={t('Поиск клиентов, платежей, групп…') as string}
                    value={query} onChange={onChangeQuery} onKeyDown={onKeyDown}
                />
                <button type="button" className={cls.closeButton} onClick={closeSearch} aria-label={t('Закрыть') as string}>
                    ×
                </button>
            </div>

            {showDropdown && (
                <GlobalSearchDropdown
                    loading={loading} data={data} flatResults={flatResults} sections={sections}
                    activeIndex={activeIndex} onHover={onHover} onSelect={onSelect}
                />
            )}
        </div>
    );
};

export const GlobalSearch = memo(() => {
    const { t } = useTranslation();
    const {
        containerRef, inputRef, isExpanded, query, setQuery, activeIndex, setActiveIndex,
        data, loading, flatResults, sections, showDropdown,
        closeSearch, openSearch, goTo, onKeyDown,
    } = useGlobalSearchState();

    return (
        <div ref={containerRef} className={classNames(cls.GlobalSearch, { [cls.expanded]: isExpanded }, [])}>
            {!isExpanded && (
                <button type="button" className={cls.iconButton} onClick={openSearch} aria-label={t('Поиск') as string}>
                    <span className={cls.icon}>{t('⌕')}</span>
                </button>
            )}
            {isExpanded && (
                <SearchPanel
                    inputRef={inputRef} query={query} onChangeQuery={(event) => setQuery(event.target.value)}
                    onKeyDown={onKeyDown} closeSearch={closeSearch} showDropdown={showDropdown}
                    loading={loading} data={data} flatResults={flatResults} sections={sections}
                    activeIndex={activeIndex} onHover={setActiveIndex} onSelect={goTo}
                />
            )}
        </div>
    );
});
