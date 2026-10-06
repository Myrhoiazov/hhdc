import { Prisma } from '@prisma/client';

// Minimal Prisma projections for the Comments API (spec #23 / #44).
//
// List rows project only the fields the client actually renders; the expanded
// author projects id + firstName (CommentCard renders author.id and
// author.firstName — the User model has no avatar column, so avatar is skipped).
// No `clientId`/`userId` on rows and no `author.lastName`: no frontend consumer
// reads those fields.

export const commentListSelect = Prisma.validator<Prisma.CommentSelect>()({
    id: true,
    text: true,
    createdAt: true,
});

export const commentListSelectWithAuthor = Prisma.validator<Prisma.CommentSelect>()({
    ...commentListSelect,
    author: {
        select: {
            id: true,
            firstName: true,
        },
    },
});