// app/api/agents/store.ts
/**
 * Shared in-memory store for agent tasks.
 * 
 * NOTE: This is for MVP only. In production, use Redis or PostgreSQL
 * to share state across serverless function instances.
 */

import type { Task } from '@/lib/agent-types';

export const taskStore = new Map<string, Task>();
export const userTaskCounts = new Map<string, number>();
export const fileStore = new Map<string, { name: string; size: number; type: string; buffer: ArrayBuffer }>();
