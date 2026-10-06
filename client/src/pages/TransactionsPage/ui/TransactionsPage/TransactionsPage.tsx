import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { classNames } from '@/shared/lib/classNames/classNames';
import s from './TransactionsPage.module.scss';
import { Page } from '@/widgets/Page/Page';
import { Text } from '@/shared/ui/Text/Text';
import { Button, ButtonTheme } from '@/shared/ui/Button';
import {
    DynamicModuleLoader,
    ReducersList,
} from '@/shared/lib/components/DynamicModuleLoader/DynamicModuleLoader';
import { transactionsPageReducer } from '../../model/slices/transactionsPageSlice';
import { VStack } from '@/shared/ui/Stack';
import { Transaction, TransactionList } from '@/entities/Transaction';
import { FiltersContainer } from '../FiltersContainer/FiltersContainer';
import { SummaryCards } from '@/entities/Summary';
import { EditTransactionDropdown } from '@/features/editTransactionDropdown';
import { useTransactionsPage } from './useTransactionsPage';

interface TransactionsPageProps {
    className?: string;
}

const reducers: ReducersList = {
    transactionPage: transactionsPageReducer,
};

const TransactionsPagination = ({ page, totalPages, isLoading, onPreviousPage, onNextPage }: {
    page: number;
    totalPages: number;
    isLoading: boolean;
    onPreviousPage: () => void;
    onNextPage: () => void;
}) => {
    if (totalPages <= 0) {
        return null;
    }
    return (
        <div className={s.pagination}>
            <span>{page} / {totalPages}</span>
            <div className={s.paginationActions}>
                <Button theme={ButtonTheme.CLEAR} className={s.pageButton} onClick={onPreviousPage} disabled={isLoading || page <= 1}>
                    ←
                </Button>
                <Button theme={ButtonTheme.CLEAR} className={s.pageButton} onClick={onNextPage} disabled={isLoading || page >= totalPages}>
                    →
                </Button>
            </div>
        </div>
    );
};

const TransactionsPage = ({ className }: TransactionsPageProps) => {
    const { t } = useTranslation();
    const {
        transactions, summary, isLoading, page, total, totalPages,
        fetchAllTransactions, onPreviousPage, onNextPage,
    } = useTransactionsPage();

    const pagination = total > 0 ? (
        <TransactionsPagination
            page={page} totalPages={totalPages} isLoading={isLoading}
            onPreviousPage={onPreviousPage} onNextPage={onNextPage}
        />
    ) : null;

    return (
        <DynamicModuleLoader reducers={reducers}>
            <Page className={classNames(s.TransactionsPage, {}, [className])}>
                <VStack max gap="16">
                    <SummaryCards summary={summary} isLoading={isLoading} />
                    <FiltersContainer reloadPage={fetchAllTransactions} />
                    <VStack gap="16" max>
                        <Text title={t('Финансовый Учет')} bold />
                        {pagination}
                        <TransactionList
                            isLoading={isLoading}
                            transactions={transactions}
                            renderAction={(transaction: Transaction) => (
                                transaction.source !== 'MOLLIE' ? (
                                    <EditTransactionDropdown
                                        transactionId={transaction.id ?? ''}
                                        reloadPage={fetchAllTransactions}
                                    />
                                ) : null
                            )}
                        />
                        {pagination}
                    </VStack>
                </VStack>
            </Page>
        </DynamicModuleLoader>
    );
};

export default memo(TransactionsPage);
