export interface ReadStreamParams {
  /** Name of stream to read from */
  streamName: string;
  /** Max time in ms for how long to block Redis connection before returning
   * If 0 is passed, it will block until at least one message is fetched, or timeout happens
   */
  blockMs: number;
  /** Max how many messages to fetch at a time from Redis */
  count: number;
  /** ID of last fetched message */
  lastMessageId: string;
}

export interface AddToStreamParams {
  /** Fields to store in stream */
  fieldsToStore: Record<string, any>;
  /** Name of stream to add to */
  streamName: string;
}
