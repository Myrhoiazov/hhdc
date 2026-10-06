interface RateLimitResult {
    count: number;
    resetAt: number;
    limited: boolean;
    retryAfterSeconds: number;
    store: 'redis' | 'memory';
}

interface RateLimitOptions {
    key: string;
    windowMs: number;
    maxAttempts: number;
}

interface AttemptState {
    count: number;
    resetAt: number;
}

type RedisClient = {
    connect: () => Promise<unknown>;
    isOpen: boolean;
    incr: (key: string) => Promise<number>;
    pExpire: (key: string, milliseconds: number) => Promise<unknown>;
    pTTL: (key: string) => Promise<number>;
    del: (key: string) => Promise<unknown>;
    on: (event: 'error', listener: (error: Error) => void) => unknown;
};

const attempts = new Map<string, AttemptState>();
let redisClientPromise: Promise<RedisClient | null> | null = null;
let redisDisabled = false;

const redisUrl = () => process.env.REDIS_URL?.trim();

const removeExpiredAttempts = (now: number) => {
    if (attempts.size < 1000) return;
    attempts.forEach((state, key) => {
        if (state.resetAt <= now) attempts.delete(key);
    });
};

const getRedisClient = async (): Promise<RedisClient | null> => {
    const url = redisUrl();
    if (!url || redisDisabled) return null;

    if (!redisClientPromise) {
        redisClientPromise = import('redis')
            .then(async ({ createClient }) => {
                const client = createClient({ url }) as RedisClient;
                client.on('error', (error) => {
                    console.error('Redis rate-limit client error:', error);
                });
                await client.connect();
                return client;
            })
            .catch((error): null => {
                redisDisabled = true;
                console.error('Redis rate-limit unavailable, falling back to in-memory store:', error);
                return null;
            });
    }

    const client = await redisClientPromise;
    return client?.isOpen ? client : null;
};

const hitMemoryStore = ({ key, windowMs, maxAttempts }: RateLimitOptions): RateLimitResult => {
    const now = Date.now();
    removeExpiredAttempts(now);
    const current = attempts.get(key);
    const state = !current || current.resetAt <= now
        ? { count: 0, resetAt: now + windowMs }
        : current;

    state.count += 1;
    attempts.set(key, state);

    const retryAfterSeconds = Math.max(1, Math.ceil((state.resetAt - now) / 1000));
    return {
        count: state.count,
        resetAt: state.resetAt,
        limited: state.count > maxAttempts,
        retryAfterSeconds,
        store: 'memory',
    };
};

const hitRedisStore = async ({ key, windowMs, maxAttempts }: RateLimitOptions): Promise<RateLimitResult | null> => {
    const client = await getRedisClient();
    if (!client) return null;

    try {
        const count = await client.incr(key);
        if (count === 1) {
            await client.pExpire(key, windowMs);
        }
        const ttl = await client.pTTL(key);
        const safeTtl = ttl > 0 ? ttl : windowMs;
        const resetAt = Date.now() + safeTtl;
        return {
            count,
            resetAt,
            limited: count > maxAttempts,
            retryAfterSeconds: Math.max(1, Math.ceil(safeTtl / 1000)),
            store: 'redis',
        };
    } catch (error) {
        redisDisabled = true;
        console.error('Redis rate-limit hit failed, falling back to in-memory store:', error);
        return null;
    }
};

export const hitRateLimit = async (options: RateLimitOptions): Promise<RateLimitResult> => {
    const redisResult = await hitRedisStore(options);
    return redisResult ?? hitMemoryStore(options);
};

export const resetRateLimit = async (key: string) => {
    attempts.delete(key);
    const client = await getRedisClient();
    if (!client) return;
    try {
        await client.del(key);
    } catch (error) {
        console.error('Redis rate-limit reset failed:', error);
    }
};

export const calculateProgressiveDelayMs = (count: number) => {
    if (count <= 1) return 0;
    const baseDelay = Math.min(2000, (count - 1) * 250);
    const jitter = Math.floor(Math.random() * 150);
    return baseDelay + jitter;
};
