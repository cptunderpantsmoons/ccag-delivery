import { z } from "zod";
import { identifierSchema, successResponseSchema, workspaceIdParamsSchema } from "./common.js";

const jsonRecordSchema = z.record(z.string(), z.unknown());

export const workspaceConfigSnapshotSchema = z.object({
  effective: z.object({
    opencode: jsonRecordSchema,
    ccag: jsonRecordSchema,
  }),
  materialized: z.object({
    compatibilityOpencodePath: z.string().nullable(),
    compatibilityCcagPath: z.string().nullable(),
    configDir: z.string().nullable(),
    configOpencodePath: z.string().nullable(),
    configCcagPath: z.string().nullable(),
  }),
  stored: z.object({
    opencode: jsonRecordSchema,
    ccag: jsonRecordSchema,
  }),
  updatedAt: z.string(),
  workspaceId: identifierSchema,
}).meta({ ref: "CCAGServerV2WorkspaceConfigSnapshot" });

export const workspaceConfigPatchRequestSchema = z.object({
  opencode: jsonRecordSchema.optional(),
  ccag: jsonRecordSchema.optional(),
}).meta({ ref: "CCAGServerV2WorkspaceConfigPatchRequest" });

export const rawOpencodeConfigQuerySchema = z.object({
  scope: z.enum(["global", "project"]).optional(),
}).meta({ ref: "CCAGServerV2RawOpencodeConfigQuery" });

export const rawOpencodeConfigWriteRequestSchema = z.object({
  content: z.string(),
  scope: z.enum(["global", "project"]).optional(),
}).meta({ ref: "CCAGServerV2RawOpencodeConfigWriteRequest" });

export const rawOpencodeConfigDataSchema = z.object({
  content: z.string(),
  exists: z.boolean(),
  path: z.string().nullable(),
  updatedAt: z.string(),
}).meta({ ref: "CCAGServerV2RawOpencodeConfigData" });

export const workspaceConfigResponseSchema = successResponseSchema(
  "CCAGServerV2WorkspaceConfigResponse",
  workspaceConfigSnapshotSchema,
);

export const rawOpencodeConfigResponseSchema = successResponseSchema(
  "CCAGServerV2RawOpencodeConfigResponse",
  rawOpencodeConfigDataSchema,
);

export const rawOpencodeConfigParamsSchema = workspaceIdParamsSchema.meta({ ref: "CCAGServerV2RawOpencodeConfigParams" });
