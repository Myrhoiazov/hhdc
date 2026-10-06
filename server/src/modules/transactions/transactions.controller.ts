import { Request, Response } from "express";
import { createTransaction, getAllTransactions, getTransactionsChart, getTransactionsSummary, TransactionChartPeriod } from "./transactions.service";
import { Transaction } from '@prisma/client';
import { deleteTransactionById } from "./transactions.service";
import { createCsv } from "../payments/payments.utils.service";

export const fetchAllTransactionsController = async (req: Request, res: Response) => {

    try {
        const transactions = await getAllTransactions(req.query);

        return res.status(200).json(transactions);
    } catch (error) {
        console.error('Error fetching users:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

export const createTransactionController = async (req: Request<{}, {}, Transaction>, res: Response) => {
    const data = req.body

    try {
        const transactions = await createTransaction(data)
        return res.status(200).json(transactions);
    } catch (error) {
        console.error('Error fetching users:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

export const getTransactionSummaryController = async (req: Request, res: Response) => {
    try {
        const summary = await getTransactionsSummary(req.query);
        return res.status(200).json(summary);
    } catch (error) {
        console.error('Error fetching transaction summary:', error);
        res.status(500).json({ error: 'Failed to fetch summary' });
    }
};

export const getTransactionChartController = async (req: Request, res: Response) => {
    try {
        const period = typeof req.query.period === 'string'
            ? req.query.period as TransactionChartPeriod
            : 'week';
        const chart = await getTransactionsChart(period);

        return res.status(200).json(chart);
    } catch (error) {
        console.error('Error fetching transaction chart:', error);
        res.status(500).json({ error: 'Failed to fetch transaction chart' });
    }
};

export const exportMonthlyRevenueController = async (req: Request, res: Response) => {
    try {
        const chart = await getTransactionsChart('year');
        const csv = createCsv(
            ['Month', 'Income', 'Expense', 'Balance', 'Currency'],
            chart.items.map((item) => [
                item.key,
                item.income.toFixed(2),
                item.expense.toFixed(2),
                (item.income - item.expense).toFixed(2),
                'EUR',
            ]),
        );

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="monthly-revenue-${new Date().toISOString().slice(0, 10)}.csv"`);
        return res.status(200).send(csv);
    } catch (error) {
        console.error('Error exporting monthly revenue:', error);
        return res.status(500).json({ error: 'Failed to export monthly revenue' });
    }
};

export const deleteTransactionByIdController = async (req: Request, res: Response) => {
    const transactionId = Number(req.params.id);

    try {
        await deleteTransactionById(transactionId);
        return res.status(200).json({ message: 'Transaction deleted successfully' });
    } catch (error) {
        console.error('Error deleting transaction:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}
