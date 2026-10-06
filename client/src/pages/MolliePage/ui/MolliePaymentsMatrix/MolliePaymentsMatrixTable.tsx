import { memo, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { formatAmount, MatrixMonth, MatrixRow } from './useMolliePaymentsMatrix';
import s from './MolliePaymentsMatrix.module.scss';

interface MolliePaymentsMatrixTableProps {
    rows: MatrixRow[];
    visibleMonths: MatrixMonth[];
    getPaidMonths: (row: MatrixRow) => number;
}

const MatrixTableHeader = ({
    visibleMonths,
    tableStyle,
}: {
    visibleMonths: MatrixMonth[];
    tableStyle: CSSProperties;
}) => {
    const { t } = useTranslation();
    return (
        <div className={`${s.row} ${s.tableHeader}`} style={tableStyle}>
            <div className={`${s.personCell} ${s.stickyCell}`}>{t('Ученик / плательщик')}</div>
            {visibleMonths.map((month) => (
                <div className={s.monthHeader} key={month.key}>
                    <span>{month.label}</span>
                    <small>{month.year}</small>
                </div>
            ))}
            <div className={s.totalHeader}>{t('Оплачено')}</div>
        </div>
    );
};

const MatrixPersonCell = ({ row }: { row: MatrixRow }) => (
    <div className={`${s.personCell} ${s.stickyCell}`}>
        {row.clientId ? (
            <Link className={s.personLink} to={`/clients/${row.clientId}`}>{row.name}</Link>
        ) : row.customerId ? (
            <Link className={s.personLink} to={`/mollie/customers/${row.customerId}`}>{row.name}</Link>
        ) : (
            <span className={s.personLink}>{row.name}</span>
        )}
        <span className={s.personMeta}>
            {row.payerNames.length ? `Плательщик: ${row.payerNames.join(', ')}` : 'Плательщик не привязан'}
        </span>
        {row.branch && <span className={s.personMeta}>{row.branch}</span>}
    </div>
);

const MatrixCells = ({ row, visibleMonths }: { row: MatrixRow; visibleMonths: MatrixMonth[] }) => {
    const { t } = useTranslation();
    return (
        <>
            {visibleMonths.map((month) => {
                const cell = row.cells[month.key];
                const title = cell?.paid
                    ? `${cell.paidCount} оплат · ${formatAmount(cell)}`
                    : cell?.issueCount
                        ? `${cell.issueCount} проблемных оплат`
                        : 'Оплат нет';

                return (
                    <div
                        className={`${s.monthCell} ${cell?.paid ? s.paid : ''} ${cell?.issueCount ? s.issue : ''}`}
                        key={month.key}
                        title={title}
                    >
                        {cell?.paid ? (
                            <>
                                <b>{t('✓')}</b>
                                <small>{formatAmount(cell)}</small>
                            </>
                        ) : cell?.issueCount ? (
                            <b>!</b>
                        ) : (
                            <span>—</span>
                        )}
                    </div>
                );
            })}
        </>
    );
};

export const MolliePaymentsMatrixTable = memo((props: MolliePaymentsMatrixTableProps) => {
    const { rows, visibleMonths, getPaidMonths } = props;
    const { t } = useTranslation();

    const tableStyle = {
        gridTemplateColumns: `minmax(250px, 1.7fr) repeat(${visibleMonths.length}, minmax(92px, 0.7fr)) minmax(88px, 0.6fr)`,
    };
    const tableMinWidth = Math.max(520 + visibleMonths.length * 92, 720);

    return (
        <div className={s.tableViewport}>
            <div className={s.table} style={{ minWidth: tableMinWidth }}>
                <MatrixTableHeader visibleMonths={visibleMonths} tableStyle={tableStyle} />

                {rows.map((row) => (
                    <div className={s.row} key={row.key} style={tableStyle}>
                        <MatrixPersonCell row={row} />
                        <MatrixCells row={row} visibleMonths={visibleMonths} />
                        <div className={s.totalCell}>{getPaidMonths(row)}</div>
                    </div>
                ))}

                {!rows.length && (
                    <div className={s.empty}>{t('По выбранному фильтру ничего не найдено.')}</div>
                )}
            </div>
        </div>
    );
});
