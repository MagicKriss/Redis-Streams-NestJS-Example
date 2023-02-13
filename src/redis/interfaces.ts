export interface StreamParamsBase {
  /** Name of stream to read from */
  streamName: string;
  /** Max time in ms for how long to block Redis connection before returning
   * If 0 is passed, it will block until at least one message is fetched, or timeout happens
   * */
  blockMs: number;
  /** Max how many messages to fetch at a time from Redis */
  count: number;
}

export interface ReadStreamParams extends StreamParamsBase {
  /** ID of last fetched message */
  lastMessageId: string;
}

export interface AddToStreamParams {
  /** Fields to store in stream */
  fieldsToStore: Record<string, any>;
  /** Name of stream to add to */
  streamName: string;
}

export interface CosnumeStreamParams extends StreamParamsBase {
  /** Name of consumer group */
  group: string;
  /** Name of consumer, must be unique within group */
  consumer: string;
}

export interface AcknowledgeMessageParams {
  /** Name of stream to acknowledge message in */
  streamName: string;
  /** Name of consumer group */
  group: string;
  /** ID of messages to acknowledge */
  messageIds: string[];
}

export interface AutoclaimMessageParams {
  /** Name of stream to acknowledge message in */
  streamName: string;
  /** Name of consumer group */
  group: string;
  /** Name of consumer */
  consumer: string;
  /** Minimum idle time in ms for message to be eligible for auto-claim */
  minIdleTimeMs: number;
  /** Max how many messages to claim at a time from Redis */
  count: number;
}

export interface ReadConsumerGroupParams {
  /** Name of stream to read from */
  streamName: string;
  /** Name of consumer group */
  group: string;
  /** Name of consumer, must be unique within group */
  consumer: string;
  /** Count of messages to fetch */
  count: number;
  /**
   * Minimum idle time in ms for message to be eligible for auto-claim - re-claim from other consumer, if not acknowledged
   * @default 5000
   * */
  autoClaimMinIdleTimeMs?: number;
  /**
   * Should messages be acknowledged automatically after being read
   * If false, you must manually acknowledge messages using acknowledgeMessage
   * @default true
   * */
  autoAck?: boolean;
}
