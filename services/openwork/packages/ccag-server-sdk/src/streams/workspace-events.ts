import { normalizeServerBaseUrl } from "../client.js";
import type { CCAGServerV2WorkspaceEvent } from "../../generated/types.gen";
import {
  createCCAGServerEventStream,
  type CCAGServerEventStreamOptions,
  type CCAGServerEventStreamResult,
} from "./sse.js";

export type CCAGServerWorkspaceEvent = CCAGServerV2WorkspaceEvent;

export type CCAGServerWorkspaceEventStreamOptions = Omit<
  CCAGServerEventStreamOptions<CCAGServerWorkspaceEvent>,
  "url"
> & {
  baseUrl: string;
  workspaceId: string;
};

export type CCAGServerWorkspaceEventStreamResult = CCAGServerEventStreamResult<CCAGServerWorkspaceEvent>;

export function createCCAGServerWorkspaceEventStream(
  options: CCAGServerWorkspaceEventStreamOptions,
): CCAGServerWorkspaceEventStreamResult {
  const baseUrl = normalizeServerBaseUrl(options.baseUrl);
  const url = `${baseUrl}/workspaces/${encodeURIComponent(options.workspaceId)}/events`;
  return createCCAGServerEventStream<CCAGServerWorkspaceEvent>({
    ...options,
    url,
  });
}
