export const CCAG_DEPLOYMENT_ENV_VAR = "VITE_CCAG_DEPLOYMENT";

export type CCAGDeployment = "desktop" | "web";

function normalizeDeployment(value: string | undefined): CCAGDeployment {
  const normalized = value?.trim().toLowerCase();
  return normalized === "web" ? "web" : "desktop";
}

export function getCCAGDeployment(): CCAGDeployment {
  const envValue =
    typeof import.meta !== "undefined" && typeof import.meta.env?.VITE_CCAG_DEPLOYMENT === "string"
      ? import.meta.env.VITE_CCAG_DEPLOYMENT
      : undefined;

  return normalizeDeployment(envValue);
}

export function isWebDeployment(): boolean {
  return getCCAGDeployment() === "web";
}

export function isDesktopDeployment(): boolean {
  return getCCAGDeployment() === "desktop";
}
