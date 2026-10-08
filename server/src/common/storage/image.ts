import sharp from 'sharp';
import { ApiError } from '../http';

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_IMAGE_SIDE = 12_000;
const DISPLAY_SIDE = 1600;
const THUMB_SIDE = 400;

export type ImageFormat = 'jpeg' | 'png' | 'webp';

const startsWith = (content: Buffer, bytes: number[], offset = 0) => bytes.every((byte, index) => content[offset + index] === byte);

// The format is read from the file's first bytes: the declared MIME type and the file name are
// whatever the sender says they are.
export const detectImageFormat = (content: Buffer): ImageFormat | null => {
    if (startsWith(content, [0xff, 0xd8, 0xff])) return 'jpeg';
    if (startsWith(content, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'png';
    if (startsWith(content, [0x52, 0x49, 0x46, 0x46]) && startsWith(content, [0x57, 0x45, 0x42, 0x50], 8)) return 'webp';
    return null;
};

export interface ProcessedImage {
    format: ImageFormat;
    width: number;
    height: number;
    display: Buffer;
    thumb: Buffer;
}

const rejectImage = (message: string) => new ApiError(400, 'IMAGE_REJECTED', message);

const variant = (content: Buffer, side: number): Promise<Buffer> => sharp(content)
    // rotate() applies the EXIF orientation; the output carries no metadata, so no location leaks.
    .rotate().resize({ width: side, height: side, fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();

// Validates a photo and renders the two variants shown in the CRM. The original is kept as is,
// privately; only the metadata-free variants are meant for display.
export const processImage = async (content: Buffer): Promise<ProcessedImage> => {
    if (content.length > MAX_IMAGE_BYTES) throw new ApiError(413, 'IMAGE_REJECTED', 'A photo cannot be larger than 10 MB');
    const format = detectImageFormat(content);
    if (!format) throw rejectImage('Only JPEG, PNG and WebP photos are accepted');
    const metadata = await sharp(content).metadata().catch((): null => null);
    if (!metadata?.width || !metadata.height || metadata.format !== format) throw rejectImage('The file is not a valid image');
    if (metadata.width > MAX_IMAGE_SIDE || metadata.height > MAX_IMAGE_SIDE) throw rejectImage('The photo is too large in pixels');
    const [display, thumb] = await Promise.all([variant(content, DISPLAY_SIDE), variant(content, THUMB_SIDE)]);
    return { format, width: metadata.width, height: metadata.height, display, thumb };
};
