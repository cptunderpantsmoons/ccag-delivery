import { createSseClient } from "../../generated/core/serverSentEvents.gen";
import type { ServerSentEventsOptions, ServerSentEventsResult, StreamEvent } from "../../generated/core/serverSentEvents.gen";

export type CCAGServerEventStreamOptions<TData = unknown> = ServerSentEventsOptions<TData>;
export type CCAGServerEventStreamResult<TData = unknown> = ServerSentEventsResult<TData>;
export type CCAGServerStreamEvent<TData = unknown> = StreamEvent<TData>;

export function createCCAGServerEventStream<TData = unknown>(options: CCAGServerEventStreamOptions<TData>) {
  return createSseClient<TData>(options as ServerSentEventsOptions<unknown>) as CCAGServerEventStreamResult<TData>;
}
