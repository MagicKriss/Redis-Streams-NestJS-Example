import { createClient } from 'redis';

/**
 * Since node-redis does not expose types for its client, we have to create our own.
 */
export type RedisClient = ReturnType<typeof createClient>;

/**
 * Redis stream message type
 */
export type RedisStreamMessage = Awaited<
  ReturnType<RedisClient['xRead']>
>[number]['messages'][number];

/**
 * Custom generator type for redis streams
 */
export type AsyncRedisStreamGenerator = AsyncGenerator<
  RedisStreamMessage,
  void,
  unknown
>;

/**
 * Injection token for redis client
 */
export const REDIS_CLIENT = Symbol('REDIS_CLIENT');
