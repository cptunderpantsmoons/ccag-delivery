export type CcagPublisherBundleType = "skill" | "workspace-profile" | "skills-set";

export type PublishBundleResult = {
  url: string;
};

const ENV_CCAG_PUBLISHER_BASE_URL = String(import.meta.env.VITE_CCAG_PUBLISHER_BASE_URL ?? "").trim();

export const DEFAULT_CCAG_PUBLISHER_BASE_URL =
  ENV_CCAG_PUBLISHER_BASE_URL || "https://share.openworklabs.com";

function normalizeBaseUrl(input: string): string {
  const trimmed = String(input ?? "").trim();
  if (!trimmed) {
    throw new Error("Publisher baseUrl is required");
  }
  return trimmed.replace(/\/+$/, "");
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const text = await response.text();
    if (!text.trim()) return "";
    try {
      const json = JSON.parse(text) as Record<string, unknown>;
      if (json && typeof json.message === "string" && json.message.trim()) {
        return json.message.trim();
      }
    } catch {
      // ignore
    }
    return text.trim();
  } catch {
    return "";
  }
}

export async function publishCcagBundleJson(input: {
  payload: unknown;
  bundleType: CcagPublisherBundleType;
  name?: string;
  baseUrl?: string;
  timeoutMs?: number;
}): Promise<PublishBundleResult> {
  const baseUrl = normalizeBaseUrl(input.baseUrl ?? DEFAULT_CCAG_PUBLISHER_BASE_URL);
  const timeoutMs = typeof input.timeoutMs === "number" && Number.isFinite(input.timeoutMs) ? input.timeoutMs : 15_000;

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), Math.max(1_000, timeoutMs));

  try {
    const response = await fetch(`${baseUrl}/v1/bundles`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-CCAG-Bundle-Type": input.bundleType,
        "X-CCAG-Schema-Version": "v1",
        ...(input.name?.trim() ? { "X-CCAG-Name": input.name.trim() } : null),
      },
      body: JSON.stringify(input.payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      const details = await readErrorMessage(response);
      const suffix = details ? `: ${details}` : "";
      throw new Error(`Publish failed (${response.status})${suffix}`);
    }

    const json = (await response.json()) as Record<string, unknown>;
    const url = typeof json.url === "string" ? json.url.trim() : "";
    if (!url) {
      throw new Error("Publisher response missing url");
    }
    return { url };
  } finally {
    window.clearTimeout(timer);
  }
}
