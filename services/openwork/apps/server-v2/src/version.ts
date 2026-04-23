import packageJson from "../package.json" with { type: "json" };

declare const __CCAG_SERVER_V2_VERSION__: string | undefined;

function normalizeVersion(value: string | undefined | null) {
  const trimmed = value?.trim() ?? "";
  return trimmed || null;
}

export function resolveServerV2Version() {
  return (
    normalizeVersion(process.env.CCAG_SERVER_V2_VERSION) ??
    normalizeVersion(
      typeof __CCAG_SERVER_V2_VERSION__ === "string"
        ? __CCAG_SERVER_V2_VERSION__
        : null,
    ) ??
    normalizeVersion(packageJson.version) ??
    "0.0.0"
  );
}
