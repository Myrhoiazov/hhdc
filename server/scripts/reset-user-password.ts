import 'dotenv/config';
import { AuthSecurityEventType } from '@prisma/client';
import prisma from '../prisma/prisma-client';
import { hashPassword, isPasswordAllowed } from '../src/modules/auth/auth.password.service';
import { recordAuthSecurityEvent } from '../src/modules/auth/auth.security-audit.service';

const readHidden = (prompt: string): Promise<string> => new Promise((resolve, reject) => {
    if (!process.stdin.isTTY || !process.stdout.isTTY) {
        reject(new Error('Команду необходимо запускать в интерактивном терминале.'));
        return;
    }

    process.stdout.write(prompt);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    let value = '';
    const onData = (input: string) => {
        for (const character of input) {
            if (character === '\u0003') {
                cleanup();
                reject(new Error('Операция отменена.'));
                return;
            }
            if (character === '\r' || character === '\n') {
                cleanup();
                process.stdout.write('\n');
                resolve(value);
                return;
            }
            if (character === '\u007f' || character === '\b') {
                value = value.slice(0, -1);
                continue;
            }
            value += character;
        }
    };

    const cleanup = () => {
        process.stdin.removeListener('data', onData);
        process.stdin.setRawMode(false);
        process.stdin.pause();
    };

    process.stdin.on('data', onData);
});

const main = async () => {
    const email = String(process.argv[2] || '').trim().toLowerCase();
    if (!email) {
        throw new Error('Укажите email: npm run user:reset-password -- user@example.com');
    }

    const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true, email: true, isEnabled: true },
    });
    if (!user) {
        throw new Error(`Пользователь ${email} не найден.`);
    }

    const password = await readHidden('Новый пароль: ');
    const confirmation = await readHidden('Повторите новый пароль: ');

    if (password !== confirmation) {
        throw new Error('Пароли не совпадают.');
    }
    if (!isPasswordAllowed(password)) {
        throw new Error('Пароль должен содержать от 12 до 128 символов.');
    }

    const passwordHash = await hashPassword(password);
    await prisma.$transaction([
        prisma.user.update({
            where: { id: user.id },
            data: {
                password: passwordHash,
                salt: null,
                isEnabled: true,
                authVersion: { increment: 1 },
            },
        }),
        prisma.session.deleteMany({ where: { userId: user.id } }),
    ]);
    await recordAuthSecurityEvent({
        type: AuthSecurityEventType.PASSWORD_RESET,
        targetUserId: user.id,
        metadata: { method: 'SERVER_CLI', email: user.email },
    });
    await recordAuthSecurityEvent({
        type: AuthSecurityEventType.SESSION_REVOKED,
        targetUserId: user.id,
        metadata: { reason: 'PASSWORD_RESET', method: 'SERVER_CLI' },
    });

    console.log(`Пароль пользователя ${user.email} обновлён, вход разрешён, старые сессии завершены.`);
};

main()
    .catch((error) => {
        console.error(error instanceof Error ? error.message : error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
