import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { EXAMPLE_STREAM_NAME } from './constants';
import { StreamHandlerService } from './redis/stream-handler.service';

@Injectable()
export class AppService implements OnModuleInit, OnModuleDestroy {
  private interval: NodeJS.Timeout = null;
  private isAlive = true;
  constructor(private readonly streamService: StreamHandlerService) {}

  redisPing() {
    return this.streamService.ping();
  }

  async onModuleInit() {
    this.populateStream();
    this.continuousReadMessages();
  }

  /**
   * For example purposes, this will add a new message to the stream every second.
   */
  private populateStream() {
    this.interval = setInterval(() => {
      this.streamService.addToStream(
        {
          hello: 'world',
          date: new Date(),
          nestedObj: { num: Date.now() % 100 },
        },
        EXAMPLE_STREAM_NAME,
      );
    }, 1000);
  }

  onModuleDestroy() {
    clearInterval(this.interval);
    this.isAlive = false;
  }

  /**
   * Since we use generators there it allows us to only fetch data when needed.
   * In this case we only fetch 1 message.
   */
  public async getSingleNewMessage() {
    const generator = this.streamService.getStreamMessageGenerator(
      EXAMPLE_STREAM_NAME,
      1,
    );
    const messageObj = await generator.next();
    if (!messageObj.done && messageObj.value) {
      return this.parseMessage(messageObj.value.message);
    }
  }

  /**
   * We can also fetch multiple messages at a time.
   */
  public async getMultipleNewMessages(count: number) {
    const generator = this.streamService.getStreamMessageGenerator(
      EXAMPLE_STREAM_NAME,
      count,
    );
    const messages: Record<string, string>[] = [];
    let counter = 0;
    for await (const messageObj of generator) {
      messages.push(this.parseMessage(messageObj.message));
      counter++;
      if (counter >= count) {
        break;
      }
    }
    return messages;
  }

  public async consumeMessageFromGroup(
    group: string,
    consumer: string,
    count: number,
  ) {
    const generator = this.streamService.getConsumerMessageGenerator({
      streamName: EXAMPLE_STREAM_NAME,
      group,
      consumer,
      count,
    });
    const messages: Record<string, string>[] = [];
    let counter = 0;
    for await (const messageObj of generator) {
      messages.push(this.parseMessage(messageObj.message));
      counter++;
      if (counter >= count) {
        break;
      }
    }
    return {
      group,
      consumer,
      messages,
    };
  }

  /**
   * This will continuously read messages from the stream until the service is destroyed.
   */
  private async continuousReadMessages() {
    const generator = this.streamService.getStreamMessageGenerator(
      EXAMPLE_STREAM_NAME,
      10,
    );
    for await (const messageObj of generator) {
      console.log(
        `Got message with ID: ${messageObj.id}`,
        JSON.stringify(this.parseMessage(messageObj.message), undefined, 2),
      );
      if (!this.isAlive) {
        break;
      }
    }
  }

  /**
   * Since Redis stores all values as strings, we need to parse them back to their original type.
   */
  private parseMessage(message: Record<string, string>) {
    return Object.entries(message).reduce((acc, [key, value]) => {
      try {
        acc[key] = JSON.parse(value);
      } catch (e) {
        acc[key] = value;
      }
      return acc;
    }, {});
  }
}
