// API contract types for the Comments module.
//
// Database model != API contract (spec #46): Prisma `Comment`/`User` rows describe
// persistence; these types describe exactly what the API returns to the frontend.
// The client (`entities/Comment` + CommentCard/CommentList UI) reads only:
//   id, text, createdAt, author.id, author.firstName
// Fields intentionally excluded from the contract (verified, no client consumer):
//   Comment.userId, Comment.clientId, User.lastName, User.avatar (no such column).

export type CommentListItemDto = {
    id: number;
    text: string | null;
    createdAt: Date;
    author?: {
        id: number;
        firstName: string | null;
    } | null;
};

// POST /comments response — the client discards the created row and refetches the
// list (`addCommentsForClient.ts` dispatches fetchCommentsByClientId right after),
// so only the identity + rendered fields are returned.
export type CreateCommentDto = {
    id: number;
    text: string | null;
    createdAt: Date;
};

export interface CreateCommentInput {
    text?: string | null;
    userId?: number | string;
    clientId?: number | string | null;
}