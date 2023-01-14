import { Controller, Get } from '@nestjs/common';
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

  // TODO implement example using consumer groups
  @Get('consume/message')
  consumeMessages() {}
}
