import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { AsyncRedisStreamGenerator } from './redis-client.type';
import { RedisService } from './redis.service';

@Injectable()
export class StreamHandlerService implements OnModuleDestroy {
  /**
   * Flag to indicate if service is alive.
   * Since we are dealing with infinite loop, we need to have a way to stop it.
   */
  private isAlive = true;

  constructor(private readonly redisService: RedisService) {}

  onModuleDestroy() {
    this.isAlive = false;
  }

  public ping() {
    return this.redisService.ping();
  }

  public addToStream(fieldsToStore: Record<string, any>, streamName: string) {
    return this.redisService.addToStream({ fieldsToStore, streamName });
  }

  /**
   * Creating generator that will read from stream
   * Utilizing generator lazy evaluation to only fetch data when needed
   */
  public async *getStreamMessageGenerator(
    streamName: string,
    count: number,
  ): AsyncRedisStreamGenerator {
    // Start with latest data
    let lastMessageId = '$';
    while (this.isAlive) {
      const response = await this.redisService.readStream({
        streamName,
        blockMs: 0, // 0 = infinite blocking until at least one message is fetched, or timeout happens
        count, // max how many messages to fetch at a time
        lastMessageId,
      });

      // If no messages returned, continue to next iteration without yielding
      if (!response || response.length === 0) {
        continue;
      }
      // Update last message id to be the last message returned from redis
      lastMessageId = response[response.length - 1].id;
      for (const message of response) {
        yield message;
      }
    }
  }
}
