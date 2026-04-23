import { z } from "zod";
import { requestIdSchema } from "./common.js";

export const errorDetailSchema = z.object({
  message: z.string(),
  path: z.array(z.union([z.string(), z.number()])).optional(),
}).meta({ ref: "CCAGServerV2ErrorDetail" });

const baseErrorSchema = z.object({
  message: z.string(),
  requestId: requestIdSchema,
  details: z.array(errorDetailSchema).optional(),
});

export const invalidRequestErrorSchema = z.object({
  ok: z.literal(false),
  error: baseErrorSchema.extend({
    code: z.literal("invalid_request"),
  }),
}).meta({ ref: "CCAGServerV2InvalidRequestError" });

export const unauthorizedErrorSchema = z.object({
  ok: z.literal(false),
  error: baseErrorSchema.extend({
    code: z.literal("unauthorized"),
  }),
}).meta({ ref: "CCAGServerV2UnauthorizedError" });

export const forbiddenErrorSchema = z.object({
  ok: z.literal(false),
  error: baseErrorSchema.extend({
    code: z.literal("forbidden"),
  }),
}).meta({ ref: "CCAGServerV2ForbiddenError" });

export const notFoundErrorSchema = z.object({
  ok: z.literal(false),
  error: baseErrorSchema.extend({
    code: z.literal("not_found"),
  }),
}).meta({ ref: "CCAGServerV2NotFoundError" });

export const internalErrorSchema = z.object({
  ok: z.literal(false),
  error: baseErrorSchema.extend({
    code: z.literal("internal_error"),
  }),
}).meta({ ref: "CCAGServerV2InternalError" });
