import { AuthorizationCode } from 'simple-oauth2';
import dotenv from 'dotenv';

dotenv.config();

const config = {
    client: {
        id: process.env.MOLLIE_CLIENT_ID,
        secret: process.env.MOLLIE_CLIENT_SECRET,
    },
    auth: {
        tokenHost: 'https://my.mollie.com',
        authorizePath: '/oauth2/authorize',
        tokenPath: '/oauth2/tokens',
    },
};

export const oauthClient = new AuthorizationCode(config);
