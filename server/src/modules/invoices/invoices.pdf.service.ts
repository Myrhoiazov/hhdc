import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { Invoice, InvoiceItem } from '@prisma/client';
import { ROOT_DIR } from '../../common/utils/paths';

type InvoiceWithItems = Invoice & {
    items: InvoiceItem[];
    paymentUrl?: string | null;
    payments?: Array<{
        paidAt: Date;
        method: string;
        reference?: string | null;
    }>;
};

interface PdfLayout {
    left: number;
    right: number;
    width: number;
}

const bundledFontDir = path.join(path.dirname(require.resolve('dejavu-fonts-ttf/package.json')), 'ttf');
const regularFontCandidates = [
    path.join(bundledFontDir, 'DejaVuSans.ttf'),
    '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
    '/System/Library/Fonts/Supplemental/Arial.ttf',
];
const boldFontCandidates = [
    path.join(bundledFontDir, 'DejaVuSans-Bold.ttf'),
    '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
    '/System/Library/Fonts/Supplemental/Arial Bold.ttf',
];

const findFont = (candidates: string[], fallback: string) => candidates.find(fs.existsSync) ?? fallback;
const regularFont = findFont(regularFontCandidates, 'Helvetica');
const boldFont = findFont(boldFontCandidates, 'Helvetica-Bold');
const resolveLogoPath = (logoUrl?: string | null) => {
    if (!logoUrl) return null;
    const pathname = logoUrl.startsWith('http') ? new URL(logoUrl).pathname : logoUrl;
    const localPath = path.resolve(ROOT_DIR, 'public', pathname.replace(/^\/+/, ''));
    const publicDir = path.resolve(ROOT_DIR, 'public') + path.sep;
    if (!localPath.startsWith(publicDir)) return null;
    return fs.existsSync(localPath) ? localPath : null;
};

const money = (cents: number, currency: string) => new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency,
}).format(cents / 100);

const date = (value: Date) => new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
}).format(value);

const fitSingleLineFontSize = (
    doc: PDFKit.PDFDocument,
    text: string,
    maxWidth: number,
    preferredSize: number,
    minimumSize: number,
) => {
    let fontSize = preferredSize;
    doc.font(boldFont);
    while (fontSize > minimumSize && doc.fontSize(fontSize).widthOfString(text) > maxWidth) fontSize -= 0.5;
    return fontSize;
};

const documentTitle = (invoice: InvoiceWithItems) => {
    if (invoice.documentType === 'CREDIT_NOTE') return 'CREDIT NOTE';
    if (invoice.documentType === 'DEBIT_NOTE') return 'DEBIT NOTE';
    return 'INVOICE';
};

const renderHeader = (doc: PDFKit.PDFDocument, invoice: InvoiceWithItems, { left, right }: PdfLayout) => {
    const primaryColor = invoice.issuerPrimaryColor || '#1d1d33';
    const logoPath = resolveLogoPath(invoice.issuerLogoUrl);
    const logoTop = 50;
    const logoHeight = logoPath ? 65 : 0;
    if (logoPath) doc.image(logoPath, left, logoTop, { fit: [100, logoHeight] });
    const titleTop = logoPath ? logoTop + logoHeight + 8 : 65;
    doc.font(boldFont).fontSize(26).fillColor(primaryColor).text(documentTitle(invoice), left, titleTop);

    const issuerTextLeft = 300;
    const issuerTextWidth = right - issuerTextLeft;
    const issuerNameFontSize = fitSingleLineFontSize(doc, invoice.issuerName, issuerTextWidth, 15, 9);
    doc.font(boldFont).fontSize(issuerNameFontSize).text(invoice.issuerName, issuerTextLeft, 55, {
        width: issuerTextWidth, height: 18, align: 'right', ellipsis: true, lineBreak: false,
    });
    doc.font(regularFont).fontSize(9).fillColor('#6b7280');
    const contactWidth = right - issuerTextLeft;
    const addressTop = 82;
    const addressHeight = invoice.issuerAddress
        ? Math.min(24, doc.heightOfString(invoice.issuerAddress, { width: contactWidth, align: 'right' }))
        : 0;
    if (invoice.issuerAddress) doc.text(invoice.issuerAddress, issuerTextLeft, addressTop, {
        width: contactWidth, height: addressHeight, align: 'right', ellipsis: true,
    });
    const emailTop = invoice.issuerAddress ? addressTop + addressHeight + 3 : addressTop;
    if (invoice.issuerEmail) doc.text(invoice.issuerEmail, issuerTextLeft, emailTop, {
        width: contactWidth, height: 11, align: 'right', ellipsis: true, lineBreak: false,
    });

    const leftHeaderBottom = titleTop + 31;
    const contactBottom = invoice.issuerEmail ? emailTop + 11 : addressTop + addressHeight;
    const headerDividerY = Math.max(132, Math.max(leftHeaderBottom, contactBottom) + 16);
    doc.moveTo(left, headerDividerY).lineTo(right, headerDividerY).lineWidth(2).strokeColor(primaryColor).stroke();
    return { headerDividerY, primaryColor };
};

const renderInvoiceInfo = (doc: PDFKit.PDFDocument, invoice: InvoiceWithItems, { left }: PdfLayout, headerDividerY: number) => {
    const headerOffset = headerDividerY - 132;
    doc.font(boldFont).fontSize(10).fillColor('#111111').text('Invoice No:', left, 158 + headerOffset);
    doc.font(regularFont).text(invoice.number, 120, 158 + headerOffset);
    doc.font(boldFont).text('Date:', 430, 158 + headerOffset);
    doc.font(regularFont).text(date(invoice.issueDate), 465, 158 + headerOffset, { width: 75, align: 'right' });
    doc.font(boldFont).text('Bill To:', left, 195 + headerOffset);
    doc.font(regularFont).text(invoice.billToName, left, 213 + headerOffset);
    if (invoice.billToEmail) doc.fillColor('#6b7280').text(invoice.billToEmail, left, 228 + headerOffset);
    return 265 + headerOffset;
};

const renderItemsTable = (doc: PDFKit.PDFDocument, invoice: InvoiceWithItems, { left, width }: PdfLayout, startY: number, primaryColor: string) => {
    let y = startY;
    doc.rect(left, y, width, 30).fill(primaryColor);
    doc.font(boldFont).fontSize(9).fillColor('#ffffff');
    doc.text('#', left + 14, y + 10, { width: 24 });
    doc.text('Description', left + 52, y + 10, { width: 215 });
    doc.text('Period', left + 285, y + 10, { width: 95 });
    doc.text('Amount', left + 390, y + 10, { width: 80, align: 'right' });
    y += 30;
    invoice.items.forEach((item, index) => {
        const rowHeight = 35;
        doc.rect(left, y, width, rowHeight).fill(index % 2 ? '#f7f7f8' : '#ffffff');
        doc.font(regularFont).fontSize(9).fillColor('#222222');
        doc.text(String(index + 1), left + 14, y + 12, { width: 24 });
        doc.text(item.description, left + 52, y + 12, { width: 215, ellipsis: true });
        doc.text(item.period ?? '', left + 285, y + 12, { width: 95, ellipsis: true });
        doc.text(money(item.totalCents, invoice.currency), left + 390, y + 12, { width: 80, align: 'right' });
        y += rowHeight;
    });
    return y;
};

const renderTotals = (doc: PDFKit.PDFDocument, invoice: InvoiceWithItems, { left, right, width }: PdfLayout, y: number) => {
    doc.moveTo(left, y).lineTo(right, y).lineWidth(1).strokeColor('#1d1d33').stroke();
    doc.rect(left, y, width, 36).fill('#f7f7f8');
    const hasPaymentActivity = invoice.paidAmountCents > 0 || invoice.creditedAmountCents > 0;
    doc.font(boldFont).fontSize(11).fillColor('#111111').text(
        invoice.documentType !== 'CREDIT_NOTE' && !hasPaymentActivity ? 'TOTAL DUE' : 'TOTAL',
        left + 300, y + 12, { width: 100, align: 'right' },
    );
    doc.fillColor('#ef4056').text(money(invoice.totalCents, invoice.currency), left + 405, y + 12, {
        width: 65, align: 'right',
    });
    y += 48;
    if (invoice.documentType !== 'CREDIT_NOTE' && hasPaymentActivity) {
        doc.font(boldFont).fontSize(9).fillColor('#111111').text('Paid:', left + 300, y, { width: 100, align: 'right' });
        doc.font(regularFont).text(money(invoice.paidAmountCents, invoice.currency), left + 405, y, { width: 65, align: 'right' });
        y += 17;
        doc.font(boldFont).text('Balance due:', left + 300, y, { width: 100, align: 'right' });
        doc.font(regularFont).fillColor('#ef4056').text(money(invoice.balanceDueCents, invoice.currency), left + 405, y, { width: 65, align: 'right' });
        y += 28;
    }
    doc.moveTo(left, y).lineTo(right, y).lineWidth(1).strokeColor('#e5e7eb').stroke();
    return y;
};

const renderPaymentDetails = (doc: PDFKit.PDFDocument, invoice: InvoiceWithItems, left: number, y: number) => {
    y += 25;
    doc.font(boldFont).fontSize(11).fillColor('#1d1d33').text('Payment Details', left, y);
    y += 25;
    const paymentRows = [
        ['Bank:', invoice.bankName],
        ['IBAN:', invoice.iban],
        ['Reference:', invoice.paymentReference],
        ['Due date:', invoice.dueDate ? date(invoice.dueDate) : null],
        ['Paid on:', invoice.payments?.[0]?.paidAt ? date(invoice.payments[0].paidAt) : null],
        ['Paid via:', invoice.payments?.[0]?.method?.replace(/_/g, ' ') ?? null],
        ['Payment ref:', invoice.payments?.[0]?.reference ?? null],
    ].filter((row): row is [string, string] => Boolean(row[1]));
    paymentRows.forEach(([label, value]) => {
        doc.font(boldFont).fontSize(9).fillColor('#111111').text(label, left, y, { width: 90 });
        doc.font(regularFont).text(value, left + 90, y, { width: 300 });
        y += 18;
    });
    if (invoice.balanceDueCents > 0 && invoice.iban && invoice.paymentReference) {
        y += 4;
        doc.font(boldFont).fontSize(9).fillColor('#1d1d33').text(
            `Bank transfer: always include reference ${invoice.paymentReference}.`,
            left, y, { width: 360 },
        );
        y += 18;
        doc.font(regularFont).fontSize(8).fillColor('#6b7280').text(
            'Without this reference, your payment may not be matched to this invoice automatically.',
            left, y, { width: 360 },
        );
        y += 18;
    }
    return y;
};

const renderPaymentButton = (doc: PDFKit.PDFDocument, invoice: InvoiceWithItems, left: number, y: number) => {
    doc.roundedRect(left, y, 180, 30, 6).fill('#b5d63d');
    doc.font(boldFont).fontSize(10).fillColor('#1d1d33').text('PAY ONLINE WITH MOLLIE', left, y + 10, {
        width: 180, align: 'center', link: invoice.paymentUrl, underline: false,
    });
    y += 40;
    doc.font(regularFont).fontSize(8).fillColor('#6b7280').text(invoice.paymentUrl, left, y, {
        width: 300, link: invoice.paymentUrl, ellipsis: true,
    });
    return y;
};

const renderQrCode = async (doc: PDFKit.PDFDocument, invoice: InvoiceWithItems, right: number, paymentSectionTop: number) => {
    const qrCode = await QRCode.toBuffer(invoice.paymentUrl!, {
        type: 'png',
        errorCorrectionLevel: 'M',
        margin: 1,
        width: 120,
        color: { dark: '#1d1d33', light: '#ffffff' },
    });
    doc.image(qrCode, right - 110, paymentSectionTop, { width: 100, height: 100, link: invoice.paymentUrl! });
    doc.font(boldFont).fontSize(8).fillColor('#1d1d33').text('SCAN TO PAY', right - 110, paymentSectionTop + 104, {
        width: 100, align: 'center',
    });
};

const renderOnlinePayment = async (doc: PDFKit.PDFDocument, invoice: InvoiceWithItems, { left, right }: PdfLayout, y: number) => {
    y += 8;
    const paymentSectionTop = y;
    if (invoice.showPaymentButton) {
        y = await renderPaymentButton(doc, invoice, left, y) + 48;
    }
    if (invoice.showPaymentQr) {
        await renderQrCode(doc, invoice, right, paymentSectionTop);
    }
    return Math.max(y, paymentSectionTop + (invoice.showPaymentQr ? 125 : 0));
};

const renderNote = (doc: PDFKit.PDFDocument, invoice: InvoiceWithItems, { left, width }: PdfLayout, y: number) => {
    if (!invoice.note) return y;
    y += 8;
    doc.font(regularFont).fontSize(9).fillColor('#6b7280').text(invoice.note, left, y, { width });
    return y;
};

const renderFooter = (doc: PDFKit.PDFDocument, invoice: InvoiceWithItems, { left, right, width }: PdfLayout) => {
    doc.moveTo(left, 745).lineTo(right, 745).lineWidth(1).strokeColor('#e5e7eb').stroke();
    doc.font(regularFont).fontSize(8).fillColor('#6b7280').text(
        invoice.issuerEmail
            ? `If you have any questions regarding this invoice, please contact us at ${invoice.issuerEmail}`
            : 'Thank you for dancing with us.',
        left, 765, { width, align: 'center' },
    );
};

export const createInvoicePdf = async (invoice: InvoiceWithItems) => {
    const doc = new PDFDocument({ size: 'A4', margin: 55 });
    const layout: PdfLayout = { left: 55, right: 540, width: 540 - 55 };

    const { headerDividerY, primaryColor } = renderHeader(doc, invoice, layout);
    let y = renderInvoiceInfo(doc, invoice, layout, headerDividerY);
    y = renderItemsTable(doc, invoice, layout, y, primaryColor);
    y = renderTotals(doc, invoice, layout, y);
    y = renderPaymentDetails(doc, invoice, layout.left, y);

    if (invoice.paymentUrl && invoice.balanceDueCents > 0 && (invoice.showPaymentButton || invoice.showPaymentQr)) {
        y = await renderOnlinePayment(doc, invoice, layout, y);
    }

    renderNote(doc, invoice, layout, y);
    renderFooter(doc, invoice, layout);

    return doc;
};
