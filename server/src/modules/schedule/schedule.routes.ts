import express from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import { asyncHandler, isToken } from '../auth/auth.middleware';
import {
    getGroups, getGroupById, createGroup, updateGroup, deleteGroup,
    getGroupManagementStats,
    getHalls, createHall, deleteHall,
    getChoreographers, createChoreographer, updateChoreographer, deleteChoreographer,
    getStyles, getStyleCards, createStyleCard, updateStyleCard, deleteStyleCard,
} from './schedule.controller';
import { ROOT_DIR } from '../../common/utils/paths';

const choreographerUploadDir = path.resolve(ROOT_DIR, 'public/upload/choreographers');
const styleUploadDir = path.resolve(ROOT_DIR, 'public/upload/styles');
fs.mkdirSync(styleUploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, choreographerUploadDir);
    },
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${uuidv4()}${ext}`);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (file.mimetype.startsWith('image/')) cb(null, true);
        else cb(new Error('Only images allowed'));
    },
});

const styleStorage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, styleUploadDir),
    filename: (_req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`),
});
const styleUpload = multer({
    storage: styleStorage,
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => file.mimetype.startsWith('image/')
        ? cb(null, true)
        : cb(new Error('Only images allowed')),
});

const router = express.Router();

// Groups
router.get('/groups-management/stats', asyncHandler(isToken), asyncHandler(getGroupManagementStats));
router.get('/groups', asyncHandler(isToken), asyncHandler(getGroups));
router.get('/groups/:id', asyncHandler(isToken), asyncHandler(getGroupById));
router.post('/groups', asyncHandler(isToken), asyncHandler(createGroup));
router.put('/groups/:id', asyncHandler(isToken), asyncHandler(updateGroup));
router.delete('/groups/:id', asyncHandler(isToken), asyncHandler(deleteGroup));

// Halls
router.get('/halls', asyncHandler(isToken), asyncHandler(getHalls));
router.post('/halls', asyncHandler(isToken), asyncHandler(createHall));
router.delete('/halls/:id', asyncHandler(isToken), asyncHandler(deleteHall));

// Choreographers
router.get('/choreographers', asyncHandler(isToken), asyncHandler(getChoreographers));
router.post('/choreographers', asyncHandler(isToken), asyncHandler(createChoreographer));
router.put('/choreographers/:id', asyncHandler(isToken), asyncHandler(updateChoreographer));
router.delete('/choreographers/:id', asyncHandler(isToken), asyncHandler(deleteChoreographer));

// Photo upload for choreographers
const uploadChoreographerPhoto = asyncHandler(async (req: express.Request, res: express.Response) => {
    if (!req.file) { res.status(400).json({ message: 'No file uploaded' }); return; }
    const url = `/upload/choreographers/${req.file.filename}`;
    res.json({ url });
});

router.post('/choreographers/upload', asyncHandler(isToken), upload.single('file'), uploadChoreographerPhoto);

// Styles
router.get('/styles', asyncHandler(isToken), asyncHandler(getStyles));
router.get('/style-cards', asyncHandler(isToken), asyncHandler(getStyleCards));
router.post('/style-cards', asyncHandler(isToken), asyncHandler(createStyleCard));
router.put('/style-cards/:id', asyncHandler(isToken), asyncHandler(updateStyleCard));
router.delete('/style-cards/:id', asyncHandler(isToken), asyncHandler(deleteStyleCard));
router.post('/style-cards/upload', asyncHandler(isToken), styleUpload.single('file'), asyncHandler(async (req: express.Request, res: express.Response) => {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    return res.json({ url: `/upload/styles/${req.file.filename}` });
}));

export default router;
