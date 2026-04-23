import { createClient } from "../generated/client/index";
import type { Client, Config, CreateClientConfig } from "../generated/client/index";

export type CCAGServerClientConfig = Config;
export type CCAGServerClient = Client;
export type CCAGServerClientFactory = CreateClientConfig;

export function normalizeServerBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, "") || baseUrl;
}

export function createCCAGServerClient(config: CCAGServerClientConfig = {}): CCAGServerClient {
  return createClient({
    ...config,
    baseUrl: config.baseUrl ? normalizeServerBaseUrl(config.baseUrl) : config.baseUrl,
  });
}
