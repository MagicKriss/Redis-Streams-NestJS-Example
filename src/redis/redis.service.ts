import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { ClientClosedError, commandOptions } from 'redis';
import {
  AcknowledgeMessageParams,
  AddToStreamParams,
  AutoclaimMessageParams,
  CosnumeStreamParams,
  ReadStreamParams
} from './interfaces';
import {
  RedisClient,
  RedisStreamMessage,
  REDIS_CLIENT,
  RedsXAutoClaimResponse,
  RedsXReadGroupResponse
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
      console.error(`Failed to xRead from Redis stream: ${error.message}`);
      return null;
    }
  }

  public async readConsumerGroup({
    streamName,
    group,
    consumer,
    blockMs,
    count,
  }: CosnumeStreamParams): Promise<RedisStreamMessage[] | null> {
    let response: RedsXReadGroupResponse = null;
    try {
      response = await this.redis.xReadGroup(
        commandOptions({ isolated: true }), // uses new connection from pool not to block other redis calls
        group,
        consumer,
        {
          key: streamName,
          id: '>',
        },
        { BLOCK: blockMs, COUNT: count },
      );
    } catch (error) {
      if (error instanceof ClientClosedError) {
        console.log(`${error.message} ...RECONNECTING`);
        await this.connectToRedis();
        return null;
      }
      if (error.message.includes('NOGROUP')) {
        console.log(`${error.message} ...CREATING GROUP`);
        await this.createConsumerGroup(streamName, group);
        return null;
      }
      console.error(
        `Failed to xReadGroup from Redis stream: ${error.message}`,
        error,
      );

      return null;
    }

    const messages = response?.[0]?.messages; // returning first stream (since only 1 stream used)
    return messages || null;
  }

  public async acknowledgeMessages({
    streamName,
    group,
    messageIds,
  }: AcknowledgeMessageParams) {
    try {
      await this.redis.xAck(streamName, group, messageIds);
    } catch (error) {
      if (error instanceof ClientClosedError) {
        console.log(`${error.message} ...RECONNECTING`);
        await this.connectToRedis();
        return null;
      }
      console.error(`Failed to xAck from Redis stream: ${error.message}`);
      return null;
    }
  }

  public async autoClaimMessage({
    streamName,
    group,
    consumer,
    minIdleTimeMs,
    count,
  }: AutoclaimMessageParams) {
    let response: RedsXAutoClaimResponse = null;
    try {
      response = await this.redis.xAutoClaim(
        streamName,
        group,
        consumer,
        minIdleTimeMs,
        '0-0', // use 0-0 to claim all messages. In case of multiple consumers, this will be used to claim messages from other consumers
        {
          COUNT: count,
        },
      );
    } catch (error) {
      if (error instanceof ClientClosedError) {
        console.log(`${error.message} ...RECONNECTING`);
        await this.connectToRedis();
        return null;
      }
      console.error(`Failed to xAutoClaim from Redis stream: ${error.message}`);
      return null;
    }
    return response?.messages || null;
  }

  private async createConsumerGroup(streamName: string, group: string) {
    try {
      await this.redis.xGroupCreate(
        streamName,
        group,
        '0', // use 0 to create group from the beginning of the stream, use '$' to create group from the end of the stream
        {
          MKSTREAM: true,
        },
      );
    } catch (error) {
      if (error.message.includes('BUSYGROUP')) {
        // Consumer group already exists
        return;
      }
      if (error instanceof ClientClosedError) {
        console.log(`${error.message} ...RECONNECTING`);
        await this.connectToRedis();
        return null;
      }
      console.error(`Failed to xGroupCreate: ${error.message}`);
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
      console.error(`[${error.name}] ${error.message}`, error);
    }
  }
}
