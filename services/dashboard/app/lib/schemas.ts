import { z } from "zod";

export const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().min(1).max(100_000),
});

export const chatRequestSchema = z.object({
  model: z.string().min(1),
  messages: z.array(chatMessageSchema).min(1).max(100),
  temperature: z.number().min(0).max(2).optional(),
  stream: z.boolean().optional(),
});

export const adminActionSchema = z.object({
  action: z.enum([
    "platform_status",
    "health_check",
    "recent_logs",
    "resource_snapshot",
    "redeploy_stack",
    "restart_service",
  ]),
  service: z.string().optional(),
});

export const benchmarkRunSchema = z.object({
  label: z.string().min(1),
  provider: z.string().min(1),
  model: z.string().min(1),
  temperature: z.number().optional(),
  maxTokens: z.number().optional(),
});

export const benchmarkRequestSchema = z.object({
  prompt: z.string().min(1).max(10_000),
  runs: z.array(benchmarkRunSchema).min(1).max(10),
});
