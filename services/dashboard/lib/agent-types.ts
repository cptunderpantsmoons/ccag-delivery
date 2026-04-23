// lib/agent-types.ts

export type TaskStatus = 'queued' | 'running' | 'waiting_approval' | 'completed' | 'failed' | 'cancelled';

export type TaskType = 'excel-to-app' | 'excel-analysis' | 'data-cleaning' | 'document-generation' | 'custom';

export type AgentSkill = 'data-analyst' | 'app-builder' | 'visual-designer' | 'document-writer';

export interface Task {
  id: string;
  name: string;
  type: TaskType;
  status: TaskStatus;
  progress: number;
  agentSkill: AgentSkill;
  createdAt: string;
  updatedAt: string;
  userId: string;
  collaborators: string[];
  sourceFileId?: string;
  prompt: string;
  components: AppComponent[];
  suggestions: ComponentSuggestion[];
  outputUrl?: string;
  error?: string;
  dependsOn?: string[];
}

export interface ComponentSuggestion {
  id: string;
  taskId: string;
  type: 'kpi' | 'chart' | 'table' | 'form' | 'filter';
  title: string;
  description: string;
  config: ComponentConfig;
  preview?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'edited';
}

export interface ComponentConfig {
  dataSource?: string;
  columns?: string[];
  aggregations?: AggregationConfig[];
  chartType?: 'bar' | 'line' | 'pie' | 'scatter' | 'area';
  filters?: FilterConfig[];
  sort?: SortConfig;
  layout?: 'grid' | 'list' | 'card';
}

export interface AggregationConfig {
  column: string;
  function: 'sum' | 'avg' | 'count' | 'min' | 'max';
  alias: string;
}

export interface FilterConfig {
  column: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'contains' | 'in';
  value: unknown;
}

export interface SortConfig {
  column: string;
  direction: 'asc' | 'desc';
}

export interface AppComponent {
  id: string;
  type: 'kpi' | 'chart' | 'table' | 'form' | 'filter';
  title: string;
  config: ComponentConfig;
  position: { x: number; y: number; w: number; h: number };
}

export interface Message {
  id: string;
  taskId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  attachments?: Attachment[];
  mentions?: AgentSkill[];
}

export interface Attachment {
  id: string;
  type: 'file' | 'image';
  name: string;
  url: string;
  size?: number;
}

export interface ExcelData {
  sheetNames: string[];
  activeSheet: string;
  headers: string[];
  rows: unknown[][];
  rowCount: number;
  columnCount: number;
}

export interface AgentSession {
  id: string;
  userId: string;
  skills: AgentSkill[];
  activeTaskIds: string[];
  createdAt: string;
}

export interface UserPresence {
  userId: string;
  userName: string;
  taskId: string;
  cursor?: { x: number; y: number };
  lastSeen: string;
}

export type CanvasMode = 'excel' | 'app' | 'document' | 'split';

export interface CanvasContent {
  mode: CanvasMode;
  excelData?: ExcelData;
  appComponents?: AppComponent[];
  documentContent?: string;
  documentFormat?: 'md' | 'pdf';
}
