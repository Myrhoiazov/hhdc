import sharp from 'sharp';

// Files for demonstration data are generated, so the repository carries no binary fixtures.

const escapePdfText = (value: string): string => value.replace(/[\\()]/g, character => `\\${character}`);

const pdfTextBlock = (title: string, lines: string[]): string => [title, ...lines]
    .map((line, index) => `BT /F1 ${index === 0 ? 18 : 11} Tf 60 ${780 - index * 24} Td (${escapePdfText(line)}) Tj ET`)
    .join('\n');

// A one-page PDF that browsers open. Text is ASCII only (built-in Helvetica).
export const demoPdf = (title: string, lines: string[]): Buffer => {
    const text = pdfTextBlock(title, lines);
    const objects = [
        '<< /Type /Catalog /Pages 2 0 R >>',
        '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
        '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
        `<< /Length ${Buffer.byteLength(text)} >>\nstream\n${text}\nendstream`,
        '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    ];
    let body = '%PDF-1.4\n';
    const offsets = objects.map((object, index) => {
        const offset = Buffer.byteLength(body);
        body += `${index + 1} 0 obj\n${object}\nendobj\n`;
        return offset;
    });
    const xrefStart = Buffer.byteLength(body);
    const xref = offsets.map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('');
    return Buffer.from(`${body}xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${xref}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`, 'latin1');
};

const photoSvg = (hue: number, variant: number): string => {
    const second = (hue + 40 + variant * 25) % 360;
    const shift = variant * 60;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1500">
        <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="hsl(${hue}, 65%, 42%)"/><stop offset="1" stop-color="hsl(${second}, 70%, 22%)"/>
        </linearGradient></defs>
        <rect width="1200" height="1500" fill="url(#g)"/>
        <circle cx="${520 + shift}" cy="520" r="170" fill="hsl(${hue}, 40%, 88%)" fill-opacity="0.9"/>
        <path d="M ${220 + shift} 1500 Q ${520 + shift} 640 ${840 + shift} 1500 Z" fill="hsl(${hue}, 40%, 88%)" fill-opacity="0.9"/>
        <circle cx="${980 - shift}" cy="${220 + variant * 90}" r="${60 + variant * 20}" fill="hsl(${second}, 80%, 70%)" fill-opacity="0.35"/>
    </svg>`;
};

// A portrait-shaped placeholder picture: a silhouette on a coloured background.
export const demoPhoto = (hue: number, variant: number): Promise<Buffer> => sharp(Buffer.from(photoSvg(hue, variant))).jpeg({ quality: 82 }).toBuffer();
