/** @jsxImportSource react */
import { useEffect } from "react";

import { ensureWorkspaceSessionSync, trackWorkspaceSessionSync } from "./session-sync";

type ReactSessionRuntimeProps = {
  workspaceId: string;
  sessionId: string | null;
  opencodeBaseUrl: string;
  ccagToken: string;
};

export function ReactSessionRuntime(props: ReactSessionRuntimeProps) {
  useEffect(() => {
    return ensureWorkspaceSessionSync({
      workspaceId: props.workspaceId,
      baseUrl: props.opencodeBaseUrl,
      ccagToken: props.ccagToken,
    });
  }, [props.workspaceId, props.opencodeBaseUrl, props.ccagToken]);

  useEffect(() => {
    return trackWorkspaceSessionSync(
      {
        workspaceId: props.workspaceId,
        baseUrl: props.opencodeBaseUrl,
        ccagToken: props.ccagToken,
      },
      props.sessionId,
    );
  }, [props.workspaceId, props.sessionId, props.opencodeBaseUrl, props.ccagToken]);

  return null;
}
