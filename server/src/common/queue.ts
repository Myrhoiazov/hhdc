import { Queue, Worker, QueueEvents, Job, Processor, WorkerOptions } from 'bullmq';
import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

// Shared Redis connection for BullMQ
export const redisConnection = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
});

export function createQueue(name: string) {
  return new Queue(name, { connection: redisConnection });
}

export function createWorker<T, R = any>(
  name: string,
  processor: Processor<T, R>,
  options?: Omit<WorkerOptions, 'connection'>
) {
  return new Worker<T, R>(name, processor, {
    connection: redisConnection,
    ...options,
  });
}

export function createQueueEvents(name: string) {
  return new QueueEvents(name, { connection: redisConnection });
}
