import { z } from "zod";
import { identifierSchema, isoTimestampSchema, successResponseSchema, workspaceIdParamsSchema } from "./common.js";

const jsonObjectSchema = z.record(z.string(), z.unknown());

export const managedKindSchema = z.enum(["mcps", "plugins", "providerConfigs", "skills"]);

export const managedItemSchema = z.object({
  auth: jsonObjectSchema.nullable(),
  cloudItemId: z.string().nullable(),
  config: jsonObjectSchema,
  createdAt: isoTimestampSchema,
  displayName: z.string(),
  id: identifierSchema,
  key: z.string().nullable(),
  metadata: jsonObjectSchema.nullable(),
  source: z.enum(["cloud_synced", "discovered", "imported", "ccag_managed"]),
  updatedAt: isoTimestampSchema,
  workspaceIds: z.array(identifierSchema),
}).meta({ ref: "CCAGServerV2ManagedItem" });

export const managedItemWriteSchema = z.object({
  auth: jsonObjectSchema.nullable().optional(),
  cloudItemId: z.string().nullable().optional(),
  config: jsonObjectSchema.optional(),
  displayName: z.string(),
  key: z.string().nullable().optional(),
  metadata: jsonObjectSchema.nullable().optional(),
  source: z.enum(["cloud_synced", "discovered", "imported", "ccag_managed"]).optional(),
  workspaceIds: z.array(identifierSchema).optional(),
}).meta({ ref: "CCAGServerV2ManagedItemWrite" });

export const managedAssignmentWriteSchema = z.object({
  workspaceIds: z.array(identifierSchema),
}).meta({ ref: "CCAGServerV2ManagedAssignmentWrite" });

export const managedItemListResponseSchema = successResponseSchema(
  "CCAGServerV2ManagedItemListResponse",
  z.object({ items: z.array(managedItemSchema) }),
);
export const managedItemResponseSchema = successResponseSchema("CCAGServerV2ManagedItemResponse", managedItemSchema);
export const managedDeleteResponseSchema = successResponseSchema(
  "CCAGServerV2ManagedDeleteResponse",
  z.object({ deleted: z.boolean(), id: identifierSchema }),
);

export const workspaceMcpItemSchema = z.object({
  config: jsonObjectSchema,
  disabledByTools: z.boolean().optional(),
  name: z.string(),
  source: z.enum(["config.global", "config.project", "config.remote"]),
}).meta({ ref: "CCAGServerV2WorkspaceMcpItem" });
export const workspaceMcpListResponseSchema = successResponseSchema(
  "CCAGServerV2WorkspaceMcpListResponse",
  z.object({ items: z.array(workspaceMcpItemSchema) }),
);
export const workspaceMcpWriteSchema = z.object({
  config: jsonObjectSchema,
  name: z.string(),
}).meta({ ref: "CCAGServerV2WorkspaceMcpWrite" });

export const workspacePluginItemSchema = z.object({
  path: z.string().optional(),
  scope: z.enum(["global", "project"]),
  source: z.enum(["config", "dir.project", "dir.global"]),
  spec: z.string(),
}).meta({ ref: "CCAGServerV2WorkspacePluginItem" });
export const workspacePluginListResponseSchema = successResponseSchema(
  "CCAGServerV2WorkspacePluginListResponse",
  z.object({ items: z.array(workspacePluginItemSchema), loadOrder: z.array(z.string()) }),
);
export const workspacePluginWriteSchema = z.object({ spec: z.string() }).meta({ ref: "CCAGServerV2WorkspacePluginWrite" });

export const scheduledJobRunSchema = z.object({
  agent: z.string().optional(),
  arguments: z.string().optional(),
  attachUrl: z.string().optional(),
  command: z.string().optional(),
  continue: z.boolean().optional(),
  files: z.array(z.string()).optional(),
  model: z.string().optional(),
  port: z.number().int().optional(),
  prompt: z.string().optional(),
  runFormat: z.string().optional(),
  session: z.string().optional(),
  share: z.boolean().optional(),
  timeoutSeconds: z.number().int().optional(),
  title: z.string().optional(),
  variant: z.string().optional(),
}).meta({ ref: "CCAGServerV2ScheduledJobRun" });

export const scheduledJobSchema = z.object({
  attachUrl: z.string().optional(),
  createdAt: isoTimestampSchema,
  invocation: z.object({ args: z.array(z.string()), command: z.string() }).optional(),
  lastRunAt: isoTimestampSchema.optional(),
  lastRunError: z.string().optional(),
  lastRunExitCode: z.number().int().optional(),
  lastRunSource: z.string().optional(),
  lastRunStatus: z.string().optional(),
  name: z.string(),
  prompt: z.string().optional(),
  run: scheduledJobRunSchema.optional(),
  schedule: z.string(),
  scopeId: z.string().optional(),
  slug: z.string(),
  source: z.string().optional(),
  timeoutSeconds: z.number().int().optional(),
  updatedAt: isoTimestampSchema.optional(),
  workdir: z.string().optional(),
}).meta({ ref: "CCAGServerV2ScheduledJob" });

export const scheduledJobListResponseSchema = successResponseSchema(
  "CCAGServerV2ScheduledJobListResponse",
  z.object({ items: z.array(scheduledJobSchema) }),
);

export const scheduledJobDeleteResponseSchema = successResponseSchema(
  "CCAGServerV2ScheduledJobDeleteResponse",
  z.object({ job: scheduledJobSchema }),
);

export const workspaceSkillItemSchema = z.object({
  description: z.string(),
  name: z.string(),
  path: z.string(),
  scope: z.enum(["global", "project"]),
  trigger: z.string().optional(),
}).meta({ ref: "CCAGServerV2WorkspaceSkillItem" });
export const workspaceSkillContentSchema = z.object({
  content: z.string(),
  item: workspaceSkillItemSchema,
}).meta({ ref: "CCAGServerV2WorkspaceSkillContent" });
export const workspaceSkillListResponseSchema = successResponseSchema(
  "CCAGServerV2WorkspaceSkillListResponse",
  z.object({ items: z.array(workspaceSkillItemSchema) }),
);
export const workspaceSkillResponseSchema = successResponseSchema("CCAGServerV2WorkspaceSkillResponse", workspaceSkillContentSchema);
export const workspaceSkillWriteSchema = z.object({
  content: z.string(),
  description: z.string().optional(),
  name: z.string(),
  trigger: z.string().optional(),
}).meta({ ref: "CCAGServerV2WorkspaceSkillWrite" });
export const workspaceSkillDeleteResponseSchema = successResponseSchema(
  "CCAGServerV2WorkspaceSkillDeleteResponse",
  z.object({ path: z.string() }),
);

export const hubRepoSchema = z.object({
  owner: z.string().optional(),
  ref: z.string().optional(),
  repo: z.string().optional(),
}).meta({ ref: "CCAGServerV2HubRepo" });
export const hubSkillItemSchema = z.object({
  description: z.string(),
  name: z.string(),
  source: z.object({ owner: z.string(), path: z.string(), ref: z.string(), repo: z.string() }),
  trigger: z.string().optional(),
}).meta({ ref: "CCAGServerV2HubSkillItem" });
export const hubSkillListResponseSchema = successResponseSchema(
  "CCAGServerV2HubSkillListResponse",
  z.object({ items: z.array(hubSkillItemSchema) }),
);
export const hubSkillInstallWriteSchema = z.object({
  overwrite: z.boolean().optional(),
  repo: hubRepoSchema.optional(),
}).meta({ ref: "CCAGServerV2HubSkillInstallWrite" });
export const hubSkillInstallResponseSchema = successResponseSchema(
  "CCAGServerV2HubSkillInstallResponse",
  z.object({
    action: z.enum(["added", "updated"]),
    name: z.string(),
    path: z.string(),
    skipped: z.number().int().nonnegative(),
    written: z.number().int().nonnegative(),
  }),
);

export const cloudSigninSchema = z.object({
  auth: jsonObjectSchema.nullable(),
  cloudBaseUrl: z.string(),
  createdAt: isoTimestampSchema,
  id: identifierSchema,
  lastValidatedAt: isoTimestampSchema.nullable(),
  metadata: jsonObjectSchema.nullable(),
  orgId: z.string().nullable(),
  serverId: identifierSchema,
  updatedAt: isoTimestampSchema,
  userId: z.string().nullable(),
}).meta({ ref: "CCAGServerV2CloudSignin" });
export const cloudSigninWriteSchema = z.object({
  auth: jsonObjectSchema.nullable().optional(),
  cloudBaseUrl: z.string(),
  metadata: jsonObjectSchema.nullable().optional(),
  orgId: z.string().nullable().optional(),
  userId: z.string().nullable().optional(),
}).meta({ ref: "CCAGServerV2CloudSigninWrite" });
export const cloudSigninResponseSchema = successResponseSchema("CCAGServerV2CloudSigninResponse", cloudSigninSchema.nullable());
export const cloudSigninValidationResponseSchema = successResponseSchema(
  "CCAGServerV2CloudSigninValidationResponse",
  z.object({ lastValidatedAt: isoTimestampSchema.nullable(), ok: z.boolean(), record: cloudSigninSchema }),
);

export const workspaceShareSchema = z.object({
  accessKey: z.string().nullable(),
  audit: jsonObjectSchema.nullable(),
  createdAt: isoTimestampSchema,
  id: identifierSchema,
  lastUsedAt: isoTimestampSchema.nullable(),
  revokedAt: isoTimestampSchema.nullable(),
  status: z.enum(["active", "disabled", "revoked"]),
  updatedAt: isoTimestampSchema,
  workspaceId: identifierSchema,
}).meta({ ref: "CCAGServerV2WorkspaceShare" });
export const workspaceShareResponseSchema = successResponseSchema("CCAGServerV2WorkspaceShareResponse", workspaceShareSchema.nullable());

export const workspaceExportWarningSchema = z.object({
  detail: z.string(),
  id: z.string(),
  label: z.string(),
}).meta({ ref: "CCAGServerV2WorkspaceExportWarning" });
export const workspaceExportDataSchema = z.object({
  commands: z.array(z.object({ description: z.string().optional(), name: z.string(), template: z.string() })),
  exportedAt: z.number().int().nonnegative(),
  files: z.array(z.object({ content: z.string(), path: z.string() })).optional(),
  ccag: jsonObjectSchema,
  opencode: jsonObjectSchema,
  skills: z.array(z.object({ content: z.string(), description: z.string().optional(), name: z.string(), trigger: z.string().optional() })),
  workspaceId: identifierSchema,
}).meta({ ref: "CCAGServerV2WorkspaceExportData" });
export const workspaceExportResponseSchema = successResponseSchema("CCAGServerV2WorkspaceExportResponse", workspaceExportDataSchema);
export const workspaceImportWriteSchema = z.record(z.string(), z.unknown()).meta({ ref: "CCAGServerV2WorkspaceImportWrite" });
export const workspaceImportResponseSchema = successResponseSchema("CCAGServerV2WorkspaceImportResponse", z.object({ ok: z.boolean() }));

export const sharedBundlePublishWriteSchema = z.object({
  bundleType: z.string(),
  name: z.string().optional(),
  payload: z.unknown(),
  timeoutMs: z.number().int().positive().optional(),
}).meta({ ref: "CCAGServerV2SharedBundlePublishWrite" });
export const sharedBundleFetchWriteSchema = z.object({
  bundleUrl: z.string(),
  timeoutMs: z.number().int().positive().optional(),
}).meta({ ref: "CCAGServerV2SharedBundleFetchWrite" });
export const sharedBundlePublishResponseSchema = successResponseSchema(
  "CCAGServerV2SharedBundlePublishResponse",
  z.object({ url: z.string() }),
);
export const sharedBundleFetchResponseSchema = successResponseSchema(
  "CCAGServerV2SharedBundleFetchResponse",
  z.record(z.string(), z.unknown()),
);

export const routerIdentityItemSchema = z.object({
  access: z.enum(["private", "public"]).optional(),
  enabled: z.boolean(),
  id: z.string(),
  pairingRequired: z.boolean().optional(),
  running: z.boolean(),
}).meta({ ref: "CCAGServerV2RouterIdentityItem" });
export const routerHealthSnapshotSchema = z.object({
  config: z.object({ groupsEnabled: z.boolean() }),
  channels: z.object({ slack: z.boolean(), telegram: z.boolean(), whatsapp: z.boolean() }),
  ok: z.boolean(),
  opencode: z.object({ healthy: z.boolean(), url: z.string(), version: z.string().optional() }),
}).meta({ ref: "CCAGServerV2RouterHealthSnapshot" });
export const routerIdentityListResponseSchema = successResponseSchema(
  "CCAGServerV2RouterIdentityListResponse",
  z.object({ items: z.array(routerIdentityItemSchema), ok: z.boolean() }),
);
export const routerTelegramInfoResponseSchema = successResponseSchema(
  "CCAGServerV2RouterTelegramInfoResponse",
  z.object({
    bot: z.object({ id: z.number().int(), name: z.string().optional(), username: z.string().optional() }).nullable(),
    configured: z.boolean(),
    enabled: z.boolean(),
    ok: z.boolean(),
  }),
);
export const routerHealthResponseSchemaCompat = successResponseSchema("CCAGServerV2RouterHealthCompatResponse", routerHealthSnapshotSchema);
export const routerTelegramWriteSchema = z.object({ access: z.enum(["private", "public"]).optional(), enabled: z.boolean().optional(), id: z.string().optional(), token: z.string() }).meta({ ref: "CCAGServerV2RouterTelegramWrite" });
export const routerSlackWriteSchema = z.object({ appToken: z.string(), botToken: z.string(), enabled: z.boolean().optional(), id: z.string().optional() }).meta({ ref: "CCAGServerV2RouterSlackWrite" });
export const routerBindingWriteSchema = z.object({ channel: z.enum(["slack", "telegram"]), directory: z.string().optional(), identityId: z.string().optional(), peerId: z.string() }).meta({ ref: "CCAGServerV2RouterBindingWrite" });
export const routerBindingListResponseSchema = successResponseSchema(
  "CCAGServerV2RouterBindingListResponse",
  z.object({
    items: z.array(z.object({ channel: z.string(), directory: z.string(), identityId: z.string(), peerId: z.string(), updatedAt: z.number().int().optional() })),
    ok: z.boolean(),
  }),
);
export const routerSendWriteSchema = z.object({ autoBind: z.boolean().optional(), channel: z.enum(["slack", "telegram"]), directory: z.string().optional(), identityId: z.string().optional(), peerId: z.string().optional(), text: z.string() }).meta({ ref: "CCAGServerV2RouterSendWrite" });
export const routerMutationResponseSchema = successResponseSchema(
  "CCAGServerV2RouterMutationResponse",
  z.record(z.string(), z.unknown()),
);

export const managedItemIdParamsSchema = z.object({ itemId: identifierSchema }).meta({ ref: "CCAGServerV2ManagedItemIdParams" });
export const workspaceNamedItemParamsSchema = workspaceIdParamsSchema.extend({ name: z.string() }).meta({ ref: "CCAGServerV2WorkspaceNamedItemParams" });
export const workspaceIdentityParamsSchema = workspaceIdParamsSchema.extend({ identityId: identifierSchema }).meta({ ref: "CCAGServerV2WorkspaceIdentityParams" });
