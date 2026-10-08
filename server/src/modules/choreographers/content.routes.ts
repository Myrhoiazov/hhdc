import { Request, RequestHandler, Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { ApiError, listRoute, route } from '../../common/http';
import { MAX_IMAGE_BYTES } from '../../common/storage/image';
import { currentUser, hasPermission, permitted } from '../auth/auth.middleware';
import { addBioVersion, bioVersionSchema, listBioVersions } from './bio.service';
import { createContact, createContactSchema, deactivateContact, listContacts, updateContact, updateContactSchema } from './contacts.service';
import { addNote, addTask, listNotes, listTasks, noteSchema, noteUpdateSchema, removeNote, taskSchema, updateNote } from './followup.service';
import { assignToEvent, assignToEventSchema, listEventHistory, updateAssignment, updateAssignmentSchema } from './history.service';
import { activityQuerySchema, conversationQuerySchema, linkConversation, linkSchema, listActivity, listConversations, unlinkConversation, unlinkSchema } from './relations.service';
import { addPhoto, listMedia, mediaDetailsSchema, mediaOrderSchema, mediaUpdateSchema, readPhoto, removePhoto, reorderPhotos, updatePhoto, type MediaVariant } from './media.service';

const param = (req: Request, name: string) => z.string().uuid().parse(req.params[name]);
const personId = (req: Request) => param(req, 'personId');

// Biographies, contacts and photos of a choreographer profile (V2.1, Phase 2).
export const choreographerContentRoutes = Router();

choreographerContentRoutes.get('/:personId/biographies', permitted('choreographers.read'), route(req => listBioVersions(personId(req))));
choreographerContentRoutes.post('/:personId/biographies', permitted('choreographers.update'), route(req => addBioVersion(personId(req), bioVersionSchema.parse(req.body), currentUser(req).id)));

choreographerContentRoutes.get('/:personId/contacts', permitted('choreographers.contacts.read'), route(req => listContacts(personId(req))));
choreographerContentRoutes.post('/:personId/contacts', permitted('choreographers.contacts.manage'), route(req => createContact(personId(req), createContactSchema.parse(req.body), { userId: currentUser(req).id })));
choreographerContentRoutes.patch('/:personId/contacts/:contactId', permitted('choreographers.contacts.manage'), route(req => updateContact(personId(req), param(req, 'contactId'), updateContactSchema.parse(req.body), { userId: currentUser(req).id })));
choreographerContentRoutes.delete('/:personId/contacts/:contactId', permitted('choreographers.contacts.manage'), route(req => deactivateContact(personId(req), param(req, 'contactId'), { userId: currentUser(req).id })));

// Event history (Phase 3). The same EventChoreographer row is what the event page shows.
choreographerContentRoutes.get('/:personId/events', permitted('choreographers.read'), route(req => listEventHistory(personId(req))));
choreographerContentRoutes.post('/:personId/events', permitted('choreographers.events.manage'), route(req => assignToEvent(personId(req), assignToEventSchema.parse(req.body), { userId: currentUser(req).id })));
choreographerContentRoutes.patch('/:personId/events/:assignmentId', permitted('choreographers.events.manage'), route(req => updateAssignment(personId(req), param(req, 'assignmentId'), updateAssignmentSchema.parse(req.body), { userId: currentUser(req).id })));

// Emails and activity (Phase 6). Mail is never copied: these read Conversation and Message.
choreographerContentRoutes.get('/:personId/conversations', permitted('choreographers.conversations.read'), listRoute(req => listConversations(personId(req), conversationQuerySchema.parse(req.query))));
choreographerContentRoutes.post('/:personId/conversations/:conversationId/link', permitted('choreographers.conversations.link'), route(req => linkConversation(personId(req), param(req, 'conversationId'), linkSchema.parse(req.body), { userId: currentUser(req).id })));
choreographerContentRoutes.delete('/:personId/conversations/:conversationId/link', permitted('choreographers.conversations.link'), route(req => unlinkConversation(personId(req), param(req, 'conversationId'), unlinkSchema.parse(req.body), { userId: currentUser(req).id })));
choreographerContentRoutes.get('/:personId/activity', permitted('choreographers.activity.read'), route(req => listActivity(personId(req), activityQuerySchema.parse(req.query), currentUser(req).permissions)));

// Notes and follow-up tasks (Phase 7). Tasks are the ordinary Task records, filtered to this person.
choreographerContentRoutes.get('/:personId/notes', permitted('choreographers.notes.read'), route(req => listNotes(personId(req))));
choreographerContentRoutes.post('/:personId/notes', permitted('choreographers.notes.manage'), route(req => addNote(personId(req), noteSchema.parse(req.body), { userId: currentUser(req).id })));
choreographerContentRoutes.patch('/:personId/notes/:noteId', permitted('choreographers.notes.manage'), route(req => updateNote(personId(req), param(req, 'noteId'), noteUpdateSchema.parse(req.body), { userId: currentUser(req).id })));
choreographerContentRoutes.delete('/:personId/notes/:noteId', permitted('choreographers.notes.manage'), route(req => removeNote(personId(req), param(req, 'noteId'), { userId: currentUser(req).id })));
choreographerContentRoutes.get('/:personId/tasks', permitted('tasks.read'), route(req => listTasks(personId(req))));
choreographerContentRoutes.post('/:personId/tasks', permitted('tasks.write'), route(req => addTask(personId(req), taskSchema.parse(req.body), { userId: currentUser(req).id })));

const photoUpload = multer({ storage: multer.memoryStorage(), limits: { files: 1, fileSize: MAX_IMAGE_BYTES, fields: 10 } }).single('file');
const acceptPhoto: RequestHandler = (req, res, next) => {
    photoUpload(req, res, error => next(error instanceof multer.MulterError ? new ApiError(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400, 'IMAGE_REJECTED', 'A photo cannot be larger than 10 MB') : error));
};

const uploadedPhoto = (req: Request) => {
    if (!req.file) throw new ApiError(400, 'IMAGE_REJECTED', 'Attach a photo');
    return { content: req.file.buffer, filename: req.file.originalname };
};

choreographerContentRoutes.get('/:personId/media', permitted('choreographers.read'), route(req => listMedia(personId(req))));
choreographerContentRoutes.post('/:personId/media', permitted('choreographers.media.manage'), acceptPhoto, route(req => addPhoto({
    personId: personId(req), upload: uploadedPhoto(req), details: mediaDetailsSchema.parse(req.body ?? {}), userId: currentUser(req).id,
})));
choreographerContentRoutes.patch('/:personId/media/reorder', permitted('choreographers.media.manage'), route(req => reorderPhotos(personId(req), mediaOrderSchema.parse(req.body).ids)));
choreographerContentRoutes.patch('/:personId/media/:mediaId', permitted('choreographers.media.manage'), route(req => updatePhoto(personId(req), param(req, 'mediaId'), mediaUpdateSchema.parse(req.body))));
choreographerContentRoutes.delete('/:personId/media/:mediaId', permitted('choreographers.media.manage'), route(req => removePhoto(personId(req), param(req, 'mediaId'), currentUser(req).id)));

const variantSchema = z.enum(['thumb', 'display', 'original']).default('display');

// The original may carry location metadata, so only people who manage media can fetch it.
export const assertVariantAllowed = (variant: MediaVariant, permissions: string[]): void => {
    if (variant === 'original' && !hasPermission(permissions, 'choreographers.media.manage')) throw new ApiError(403, 'FORBIDDEN', 'Permission required');
};

choreographerContentRoutes.get('/:personId/media/:mediaId/file', permitted('choreographers.read'), async (req, res, next) => {
    try {
        const variant = variantSchema.parse(req.query.variant);
        assertVariantAllowed(variant, currentUser(req).permissions);
        const photo = await readPhoto(personId(req), param(req, 'mediaId'), variant);
        res.setHeader('Content-Type', photo.mimeType);
        res.setHeader('Cache-Control', 'private, max-age=300');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        if (variant === 'original') res.setHeader('Content-Disposition', 'attachment');
        res.send(photo.content);
    } catch (error) { next(error); }
});
