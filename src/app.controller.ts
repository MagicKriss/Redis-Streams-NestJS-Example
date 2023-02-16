import { Controller, Get, Param } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('redis-ping')
  redisPing() {
    return this.appService.redisPing();
  }

  @Get()
  hello(): string {
    return `<!DOCTYPE html>
    <html">
      <body>
      <p>To see examples use:</p>
      <ul>
      <li><a href="/message">/message</a>  for single message </li>
      <li> <a href="/messages">/messages</a> to fetch 3 messages </li>
      <li> <a href="/consume/example-group/example-consumer/3">/consume/example-group/example-consumer/3</a> to consume 5 messages via consumer group </li>
      </ul>
      </body>
      </html>`;
  }

  @Get('message')
  getMessage() {
    return this.appService.getSingleNewMessage();
  }

  @Get('messages')
  getMessages() {
    return this.appService.getMultipleNewMessages(3);
  }

  @Get('consume/:group/:consumer/:count')
  consumeMessages(
    @Param('group') group: string,
    @Param('consumer') consumer: string,
    @Param('count') count: number,
  ) {
    return this.appService.consumeMessageFromGroup(group, consumer, count);
  }
}
