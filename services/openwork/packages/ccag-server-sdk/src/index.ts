export * from "../generated/index";
export { createClient } from "../generated/client/index";
export type {
  Client,
  ClientOptions,
  Config,
  CreateClientConfig,
  RequestOptions,
  RequestResult,
} from "../generated/client/index";
export {
  createCCAGServerClient,
  normalizeServerBaseUrl,
  type CCAGServerClient,
  type CCAGServerClientConfig,
  type CCAGServerClientFactory,
} from "./client.js";
export * from "./streams/index.js";
