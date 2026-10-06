import { Client } from '@/entities/Client';
import { User } from '@/entities/User';

export interface Comment {
    id: string;
    text: string;
    author: User;
    createdAt?: string;

    clientId?: number;

    client?: Client;
}
