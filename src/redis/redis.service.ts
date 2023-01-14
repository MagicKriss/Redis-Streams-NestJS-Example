import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { ClientClosedError, commandOptions } from 'redis';
import { AddToStreamParams, ReadStreamParams } from './interfaces';
import {
  RedisClient,
  RedisStreamMessage,
  REDIS_CLIENT,
} from './redis-client.type';

@Injectable()
export class RedisService implements OnModuleDestroy {
  public constructor(
    @Inject(REDIS_CLIENT) private readonly redis: RedisClient,
  ) {}

  ping() {
    return this.redis.ping();
  }

  /**
   * Close redis connection on shutdown
   */
  onModuleDestroy() {
    this.redis.quit();
  }

  /**
   * Adding object to stream
   */
  public async addToStream({
    fieldsToStore,
    streamName,
  }: AddToStreamParams): Promise<string> {
    // Converting object to record to store in redis
    const messageObject = Object.entries(fieldsToStore).reduce(
      (acc, [key, value]) => {
        if (typeof value === 'undefined') {
          return acc;
        }
        acc[key] = typeof value === 'string' ? value : JSON.stringify(value);
        return acc;
      },
      {} as Record<string, string>,
    );

    // Adding to stream with trimming - approximately max 100 messages
    return this.redis.xAdd(streamName, '*', messageObject, {
      TRIM: {
        strategy: 'MAXLEN',
        strategyModifier: '~',
        threshold: 100,
      },
    });
  }

  /**
   * Wrapping xRead to handle errors
   */
  public async readStream({
    streamName,
    blockMs,
    count,
    lastMessageId,
  }: ReadStreamParams): Promise<RedisStreamMessage[] | null> {
    try {
      const response = await this.redis.xRead(
        commandOptions({ isolated: true }), // uses new connection from pool not to block other redis calls
        [
          {
            key: streamName,
            id: lastMessageId,
          },
        ],
        { BLOCK: blockMs, COUNT: count },
      );

      const { messages } = response?.[0]; // returning first stream (since only 1 stream used)

      return messages || null;
    } catch (error) {
      if (error instanceof ClientClosedError) {
        console.log(`${error.message} ...RECONNECTING`);
        await this.connectToRedis();
        return null;
      }
      console.error(
        `Failed to xRead from Redis Stream: ${error.message}`,
        error?.stack,
        undefined,
        undefined,
        error,
      );
      return null;
    }
  }

  private async connectToRedis() {
    try {
      // Try to reconnect  only if connection socket is closed. Else let it be handled by reconnect strategy.
      if (!this.redis.isOpen) {
        await this.redis.connect();
      }
    } catch (error) {
      console.error(
        `[${error.name}] ${error.message}`,
        error.stack,
        undefined,
        undefined,
        error,
      );
    }
  }
}
