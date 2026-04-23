export const deepLinkBridgeEvent = "ccag:deep-link";
export const nativeDeepLinkEvent = "ccag:deep-link-native";

export type DeepLinkBridgeDetail = {
  urls: string[];
};

declare global {
  interface Window {
    __CCAG__?: {
      deepLinks?: string[];
    };
  }
}

function normalizeDeepLinks(urls: readonly string[]): string[] {
  return urls.map((url) => url.trim()).filter(Boolean);
}

export function pushPendingDeepLinks(target: Window, urls: readonly string[]): string[] {
  const normalized = normalizeDeepLinks(urls);
  if (normalized.length === 0) {
    return [];
  }

  target.__CCAG__ ??= {};
  const pending = target.__CCAG__.deepLinks ?? [];
  target.__CCAG__.deepLinks = [...pending, ...normalized];
  target.dispatchEvent(
    new CustomEvent<DeepLinkBridgeDetail>(deepLinkBridgeEvent, {
      detail: { urls: normalized },
    }),
  );
  return normalized;
}

export function drainPendingDeepLinks(target: Window): string[] {
  const pending = target.__CCAG__?.deepLinks ?? [];
  if (target.__CCAG__) {
    target.__CCAG__.deepLinks = [];
  }
  return [...pending];
}
