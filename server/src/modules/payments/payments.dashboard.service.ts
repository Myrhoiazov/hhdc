import dayjs from 'dayjs';
import prisma from '../../../prisma/prisma-client';

const paymentIssueStatuses = ['failed', 'canceled', 'expired', 'charged_back', 'chargeback'];

const toNumber = (value: unknown) => {
    if (!value) {
        return 0;
    }

    return Number(value);
};

const activeSubscriptionsCount = () => prisma.subscription.count({ where: { status: 'active' } });

const validMandatesCount = () => prisma.mandate.count({ where: { status: 'valid' } });

const paidThisMonthCount = (monthStart: Date, monthEnd: Date) => prisma.payment.count({
    where: { status: 'paid', paidAt: { gte: monthStart, lte: monthEnd } },
});

const failedPaymentsCount = () => prisma.payment.count({
    where: { status: { in: paymentIssueStatuses } },
});

const monthlyPaymentsData = (monthStart: Date, monthEnd: Date) => prisma.payment.findMany({
    where: { status: 'paid', paidAt: { gte: monthStart, lte: monthEnd } },
    select: { amountValue: true },
});

const customerSelect = {
    select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true },
};

const clientLinksSelect = {
    select: {
        id: true, payerRelation: true, linkSource: true, isPrimary: true,
        client: customerSelect,
    },
};

const customerWithClientInclude = {
    include: { client: customerSelect, clientLinks: clientLinksSelect },
};

const latestFailedPaymentsData = () => prisma.payment.findMany({
    where: { status: { in: paymentIssueStatuses } },
    include: {
        customer: customerWithClientInclude,
        subscription: { include: { customer: customerWithClientInclude } },
    },
    orderBy: { updatedAt: 'desc' },
    take: 5,
});

const mapLatestFailedPayment = (payment: Awaited<ReturnType<typeof latestFailedPaymentsData>>[number]) => ({
    id: payment.id,
    mollieId: payment.mollieId,
    status: payment.status,
    amountValue: toNumber(payment.amountValue),
    amountCurrency: payment.amountCurrency,
    description: payment.description,
    paidAt: payment.paidAt,
    updatedAt: payment.updatedAt,
    customer: (payment.customer ?? payment.subscription?.customer)
        ? {
            id: (payment.customer ?? payment.subscription.customer).id,
            mollieId: (payment.customer ?? payment.subscription.customer).mollieId,
            email: (payment.customer ?? payment.subscription.customer).email,
            givenName: (payment.customer ?? payment.subscription.customer).givenName,
            familyName: (payment.customer ?? payment.subscription.customer).familyName,
            client: (payment.customer ?? payment.subscription.customer).client,
            clientLinks: (payment.customer ?? payment.subscription.customer).clientLinks,
        }
        : null,
    subscription: payment.subscription
        ? {
            id: payment.subscription.id,
            mollieId: payment.subscription.mollieId,
            status: payment.subscription.status,
            description: payment.subscription.description,
        }
        : null,
});

export const getMollieDashboardSummary = async () => {
    const monthStart = dayjs().startOf('month').toDate();
    const monthEnd = dayjs().endOf('month').toDate();

    const [
        totalCustomers,
        activeSubscriptions,
        validMandates,
        paidThisMonth,
        failedPayments,
        monthlyPayments,
        latestFailedPayments,
    ] = await Promise.all([
        prisma.customer.count(),
        activeSubscriptionsCount(),
        validMandatesCount(),
        paidThisMonthCount(monthStart, monthEnd),
        failedPaymentsCount(),
        monthlyPaymentsData(monthStart, monthEnd),
        latestFailedPaymentsData(),
    ]);

    const monthlyRevenue = monthlyPayments.reduce(
        (sum, payment) => sum + toNumber(payment.amountValue),
        0,
    );

    return {
        period: { monthStart, monthEnd },
        totalCustomers,
        activeSubscriptions,
        validMandates,
        paidThisMonth,
        failedPayments,
        monthlyRevenue,
        currency: 'EUR',
        latestFailedPayments: latestFailedPayments.map(mapLatestFailedPayment),
    };
};
