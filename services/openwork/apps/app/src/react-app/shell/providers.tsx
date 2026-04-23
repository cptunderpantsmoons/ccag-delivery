/** @jsxImportSource react */
import { useEffect, type ReactNode } from "react";

import { isWebDeployment } from "../../app/lib/ccag-deployment";
import { hydrateCcagServerSettingsFromEnv, readCcagServerSettings } from "../../app/lib/ccag-server";
import { isDesktopRuntime } from "../../app/utils";
import { DenAuthProvider } from "../domains/cloud/den-auth-provider";
import { DesktopConfigProvider } from "../domains/cloud/desktop-config-provider";
import { RestrictionNoticeProvider } from "../domains/cloud/restriction-notice-provider";
import { LocalProvider } from "../kernel/local-provider";
import { ServerProvider } from "../kernel/server-provider";
import { BootStateProvider } from "./boot-state";
import { DesktopRuntimeBoot } from "./desktop-runtime-boot";
import { startDebugLogger, stopDebugLogger } from "./debug-logger";
import { MigrationPrompt } from "./migration-prompt";

function resolveDefaultServerUrl(): string {
  if (isDesktopRuntime()) return "http://127.0.0.1:4096";

  const ccagUrl =
    typeof import.meta.env?.VITE_CCAG_URL === "string"
      ? import.meta.env.VITE_CCAG_URL.trim()
      : "";
  if (ccagUrl) {
    return `${ccagUrl.replace(/\/+$/, "")}/opencode`;
  }

  if (isWebDeployment() && import.meta.env.PROD && typeof window !== "undefined") {
    return `${window.location.origin}/opencode`;
  }

  const envUrl =
    typeof import.meta.env?.VITE_OPENCODE_URL === "string"
      ? import.meta.env.VITE_OPENCODE_URL.trim()
      : "";
  return envUrl || "http://127.0.0.1:4096";
}

type AppProvidersProps = {
  children: ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  hydrateCcagServerSettingsFromEnv();

  useEffect(() => {
    // Start the dev observability forwarder. Reads the current ccag-server
    // URL on every flush so reconnects after port changes still work. In prod
    // builds `startDebugLogger` is a no-op.
    startDebugLogger({
      serverUrl: () => readCcagServerSettings().urlOverride?.trim() ?? "",
    });
    return () => {
      stopDebugLogger();
    };
  }, []);

  const defaultUrl = resolveDefaultServerUrl();
  return (
    <BootStateProvider>
      <ServerProvider defaultUrl={defaultUrl}>
        <DesktopRuntimeBoot />
        <DenAuthProvider>
          <DesktopConfigProvider>
            <RestrictionNoticeProvider>
              <LocalProvider>{children}</LocalProvider>
            </RestrictionNoticeProvider>
          </DesktopConfigProvider>
        </DenAuthProvider>
        <MigrationPrompt />
      </ServerProvider>
    </BootStateProvider>
  );
}
