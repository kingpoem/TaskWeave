export type TaskType = "file" | "multi_file" | "directory";
export type ConcurrencyPolicy = "skip" | "queue" | "allow";

export type Task = {
  id: string;
  name: string;
  type: TaskType;
  path: string;
  entry?: string;
  command?: string[];
  cron: string;
  enabled: boolean;
  env?: Record<string, string>;
  workingDir?: string;
  concurrencyPolicy: ConcurrencyPolicy;
  createdAt: string;
  updatedAt: string;
};

export type RunRecord = {
  id: string;
  taskId: string;
  trigger: string;
  status: "running" | "success" | "failed" | "canceled" | "skipped" | string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  exitCode: number;
  logPath: string;
  errorSummary?: string;
};

export type Settings = {
  uvPath: string;
  defaultWorkDir: string;
  logRetentionDays: number;
};

export type TaskFormValues = {
  name: string;
  type: TaskType;
  path: string;
  entry: string;
  cron: string;
  enabled: boolean;
  workingDir: string;
  concurrencyPolicy: ConcurrencyPolicy;
};

export const emptyTaskForm: TaskFormValues = {
  name: "",
  type: "file",
  path: "",
  entry: "",
  cron: "0 0 * * * *",
  enabled: true,
  workingDir: "",
  concurrencyPolicy: "skip",
};

export const defaultSettings: Settings = {
  uvPath: "uv",
  defaultWorkDir: "",
  logRetentionDays: 30,
};
