import prisma from '../../../prisma/prisma-client';
import {
    CommentListItemDto,
    CreateCommentDto,
    CreateCommentInput,
} from './comments.dto';
import { commentListSelect, commentListSelectWithAuthor } from './comments.select';

const Comment = prisma.comment

export interface FindCommentsParams {
    entityType: 'client';
    entityId: number | string;
    expandUser?: boolean;
}


export const findManyComments = async (data: FindCommentsParams): Promise<CommentListItemDto[]> => {

    const comments = await Comment.findMany({
        where: { clientId: Number(data.entityId) },
        orderBy: { createdAt: 'desc' },
        select: data.expandUser ? commentListSelectWithAuthor : commentListSelect,
    });

    return comments

}


export const createComment = async (data: CreateCommentInput): Promise<CreateCommentDto> => {

    // The client discards this response and refetches the comment list separately
    // (see addCommentsForClient.ts), so `select` returns only identity + rendered
    // fields and `include: { author: true, client: true }` is never used — the full
    // User row (including the password hash and salt) must not leave the server.
    return await Comment.create({
        data: {
            text: data?.text,
            userId: Number(data.userId),
            clientId: data.clientId ? Number(data.clientId) : undefined,
        },
        select: {
            id: true,
            text: true,
            createdAt: true,
        },
    });
};