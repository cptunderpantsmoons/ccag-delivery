import { z } from "zod";
import { identifierSchema, successResponseSchema, workspaceIdParamsSchema } from "./common.js";

const jsonRecordSchema = z.record(z.string(), z.unknown());

export const sessionStatusSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("idle") }),
  z.object({ type: z.literal("busy") }),
  z.object({
    type: z.literal("retry"),
    attempt: z.number(),
    message: z.string(),
    next: z.number(),
  }),
]).meta({ ref: "CCAGServerV2SessionStatus" });

const sessionTimeSchema = z.object({
  archived: z.number().optional(),
  completed: z.number().optional(),
  created: z.number().optional(),
  updated: z.number().optional(),
}).passthrough().meta({ ref: "CCAGServerV2SessionTime" });

const sessionSummarySchema = z.object({
  additions: z.number().optional(),
  deletions: z.number().optional(),
  files: z.number().optional(),
}).passthrough().meta({ ref: "CCAGServerV2SessionSummary" });

export const sessionSchema = z.object({
  directory: z.string().nullish(),
  id: identifierSchema,
  parentID: z.string().nullish(),
  revert: z.object({
    messageID: identifierSchema,
  }).partial().nullish(),
  slug: z.string().nullish(),
  summary: sessionSummarySchema.optional(),
  time: sessionTimeSchema.optional(),
  title: z.string().nullish(),
}).passthrough().meta({ ref: "CCAGServerV2Session" });

const sessionMessageInfoSchema = z.object({
  id: identifierSchema,
  parentID: z.string().nullish(),
  role: z.string(),
  sessionID: identifierSchema,
  time: sessionTimeSchema.optional(),
}).passthrough().meta({ ref: "CCAGServerV2SessionMessageInfo" });

export const sessionMessagePartSchema = z.object({
  id: identifierSchema,
  messageID: identifierSchema,
  sessionID: identifierSchema,
  type: z.string().optional(),
}).passthrough().meta({ ref: "CCAGServerV2SessionMessagePart" });

export const sessionMessageSchema = z.object({
  info: sessionMessageInfoSchema,
  parts: z.array(sessionMessagePartSchema),
}).passthrough().meta({ ref: "CCAGServerV2SessionMessage" });

export const sessionTodoSchema = z.object({
  content: z.string(),
  priority: z.string(),
  status: z.string(),
}).passthrough().meta({ ref: "CCAGServerV2SessionTodo" });

export const sessionSnapshotSchema = z.object({
  messages: z.array(sessionMessageSchema),
  session: sessionSchema,
  status: sessionStatusSchema,
  todos: z.array(sessionTodoSchema),
}).meta({ ref: "CCAGServerV2SessionSnapshot" });

export const workspaceEventSchema = z.object({
  properties: z.unknown().optional(),
  type: z.string(),
}).meta({ ref: "CCAGServerV2WorkspaceEvent" });

export const sessionListQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(500).optional(),
  roots: z.coerce.boolean().optional(),
  search: z.string().trim().min(1).optional(),
  start: z.coerce.number().int().nonnegative().optional(),
}).meta({ ref: "CCAGServerV2SessionListQuery" });

export const sessionMessagesQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(500).optional(),
}).meta({ ref: "CCAGServerV2SessionMessagesQuery" });

export const sessionIdParamsSchema = workspaceIdParamsSchema.extend({
  sessionId: identifierSchema.describe("Stable session identifier within the resolved workspace backend."),
}).meta({ ref: "CCAGServerV2SessionIdParams" });

export const messageIdParamsSchema = sessionIdParamsSchema.extend({
  messageId: identifierSchema.describe("Stable message identifier within the resolved session."),
}).meta({ ref: "CCAGServerV2MessageIdParams" });

export const messagePartParamsSchema = messageIdParamsSchema.extend({
  partId: identifierSchema.describe("Stable message part identifier within the resolved message."),
}).meta({ ref: "CCAGServerV2MessagePartParams" });

export const sessionCreateRequestSchema = z.object({
  parentSessionId: identifierSchema.optional(),
  title: z.string().trim().min(1).max(300).optional(),
}).passthrough().meta({ ref: "CCAGServerV2SessionCreateRequest" });

export const sessionUpdateRequestSchema = z.object({
  archived: z.boolean().optional(),
  title: z.string().trim().min(1).max(300).optional(),
}).passthrough().meta({ ref: "CCAGServerV2SessionUpdateRequest" });

export const sessionForkRequestSchema = z.object({
  title: z.string().trim().min(1).max(300).optional(),
}).passthrough().meta({ ref: "CCAGServerV2SessionForkRequest" });

export const sessionSummarizeRequestSchema = z.object({
  modelID: z.string().trim().min(1).optional(),
  providerID: z.string().trim().min(1).optional(),
}).passthrough().meta({ ref: "CCAGServerV2SessionSummarizeRequest" });

export const messageSendRequestSchema = z.object({
  parts: z.array(z.unknown()).optional(),
  role: z.string().optional(),
}).passthrough().meta({ ref: "CCAGServerV2MessageSendRequest" });

export const promptAsyncRequestSchema = z.object({
  agent: z.string().optional(),
  messageID: identifierSchema.optional(),
  model: z.object({
    modelID: z.string(),
    providerID: z.string(),
  }).optional(),
  noReply: z.boolean().optional(),
  parts: z.array(z.unknown()).optional(),
  reasoning_effort: z.string().optional(),
  system: z.string().optional(),
  tools: z.record(z.string(), z.boolean()).optional(),
  variant: z.string().optional(),
}).passthrough().meta({ ref: "CCAGServerV2PromptAsyncRequest" });

export const commandRequestSchema = z.object({
  agent: z.string().optional(),
  arguments: z.string().optional(),
  command: z.string().min(1),
  messageID: identifierSchema.optional(),
  model: z.string().optional(),
  parts: z.array(z.unknown()).optional(),
  reasoning_effort: z.string().optional(),
  variant: z.string().optional(),
}).passthrough().meta({ ref: "CCAGServerV2CommandRequest" });

export const shellRequestSchema = z.object({
  command: z.string().min(1),
}).passthrough().meta({ ref: "CCAGServerV2ShellRequest" });

export const revertRequestSchema = z.object({
  messageID: identifierSchema,
}).meta({ ref: "CCAGServerV2RevertRequest" });

export const messagePartUpdateRequestSchema = z.object({
  text: z.string().optional(),
}).passthrough().meta({ ref: "CCAGServerV2MessagePartUpdateRequest" });

export const sessionListDataSchema = z.object({
  items: z.array(sessionSchema),
}).meta({ ref: "CCAGServerV2SessionListData" });

export const sessionStatusesDataSchema = z.object({
  items: z.record(z.string(), sessionStatusSchema),
}).meta({ ref: "CCAGServerV2SessionStatusesData" });

export const sessionTodoListDataSchema = z.object({
  items: z.array(sessionTodoSchema),
}).meta({ ref: "CCAGServerV2SessionTodoListData" });

export const messageListDataSchema = z.object({
  items: z.array(sessionMessageSchema),
}).meta({ ref: "CCAGServerV2MessageListData" });

export const acceptedActionDataSchema = z.object({
  accepted: z.literal(true),
}).meta({ ref: "CCAGServerV2AcceptedActionData" });

export const deletedActionDataSchema = z.object({
  deleted: z.literal(true),
}).meta({ ref: "CCAGServerV2DeletedActionData" });

export const sessionResponseSchema = successResponseSchema("CCAGServerV2SessionResponse", sessionSchema);
export const sessionListResponseSchema = successResponseSchema("CCAGServerV2SessionListResponse", sessionListDataSchema);
export const sessionStatusesResponseSchema = successResponseSchema(
  "CCAGServerV2SessionStatusesResponse",
  sessionStatusesDataSchema,
);
export const sessionStatusResponseSchema = successResponseSchema("CCAGServerV2SessionStatusResponse", sessionStatusSchema);
export const sessionTodoListResponseSchema = successResponseSchema(
  "CCAGServerV2SessionTodoListResponse",
  sessionTodoListDataSchema,
);
export const sessionSnapshotResponseSchema = successResponseSchema(
  "CCAGServerV2SessionSnapshotResponse",
  sessionSnapshotSchema,
);
export const messageResponseSchema = successResponseSchema("CCAGServerV2MessageResponse", sessionMessageSchema);
export const messageListResponseSchema = successResponseSchema("CCAGServerV2MessageListResponse", messageListDataSchema);
export const acceptedActionResponseSchema = successResponseSchema(
  "CCAGServerV2AcceptedActionResponse",
  acceptedActionDataSchema,
);
export const deletedActionResponseSchema = successResponseSchema(
  "CCAGServerV2DeletedActionResponse",
  deletedActionDataSchema,
);

export type SessionRecord = z.infer<typeof sessionSchema>;
export type SessionMessageRecord = z.infer<typeof sessionMessageSchema>;
export type SessionSnapshotRecord = z.infer<typeof sessionSnapshotSchema>;
export type SessionStatusRecord = z.infer<typeof sessionStatusSchema>;
export type SessionTodoRecord = z.infer<typeof sessionTodoSchema>;
export type WorkspaceEventRecord = z.infer<typeof workspaceEventSchema>;

export function parseSessionData(value: unknown) {
  return sessionSchema.parse(value);
}

export function parseSessionListData(value: unknown) {
  return z.array(sessionSchema).parse(value);
}

export function parseSessionMessageData(value: unknown) {
  return sessionMessageSchema.parse(value);
}

export function parseSessionMessagesData(value: unknown) {
  return z.array(sessionMessageSchema).parse(value);
}

export function parseSessionStatusesData(value: unknown) {
  return z.record(z.string(), sessionStatusSchema).parse(value);
}

export function parseSessionTodosData(value: unknown) {
  return z.array(sessionTodoSchema).parse(value);
}

export function parseWorkspaceEventData(value: unknown) {
  return workspaceEventSchema.parse(value);
}
