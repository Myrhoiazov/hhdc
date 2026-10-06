
import { Request, Response } from 'express';
import { createComment, FindCommentsParams, findManyComments } from './comments.service';

export const fetchByClientIdController = async (req: Request, res: Response) => {

    const { entityType, entityId, _expand } = req.query;

    if (!entityType || !entityId) {
        return res.status(400).json({ error: 'entityType and entityId are required' });
    }

    const params: FindCommentsParams = {
        entityType: entityType as 'client',
        entityId: Number(entityId),
        expandUser: _expand === 'user',
    };

    try {
        const comments = await findManyComments(params)

        if (!comments) {
            return res.status(400).json({ error: 'Unsupported entityType' });
        }

        res.status(200).json(comments);
    } catch (error) {
        console.error('Error fetching comments:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

export const createCommentController = async (req: Request, res: Response) => {

    const { text, userId, clientId } = req.body;

    if (!text || !userId) {
        return res.status(400).json({ error: 'Text and userId are required' });
    }

    if (!clientId) {
        return res.status(400).json({ error: 'clientId must be provided' });
    }

    const comment = await createComment(req.body)

    try {
        return res.status(200).json(comment);
    } catch (error) {
        console.error('Error fetching users:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

// export const getClientByIdController = async (req: Request, res: Response) => {
//     const clientId = Number(req.params.id);

//     if (!clientId) {
//         return res.status(400).json({ message: 'Client ID is required' });
//     }

//     try {
//         const Client = await getClientById(clientId);
//         if (!Client) {
//             return res.status(404).json({ message: 'Client not found' });
//         }
//         return res.status(200).json(Client);
//     } catch (error) {
//         console.error('Error deleting Client:', error);
//         return res.status(500).json({ message: 'Internal server error' });
//     }

// }

// export const deleteClientByIdController = async (req: Request, res: Response) => {
//     const clientId = Number(req.params.id);

//     if (!clientId) {
//         return res.status(400).json({ message: 'Client ID is required' });
//     }

//     try {
//         const deletedClient = await deleteClient(clientId);

//         if (!deletedClient) {
//             return res.status(404).json({ message: 'Client not found or already deleted' });
//         }

//         return res.status(200).json({ message: 'Client successfully deleted', client: deletedClient });
//     } catch (error) {
//         console.error('Error deleting client:', error);
//         return res.status(500).json({ message: 'Internal server error' });
//     }
// };