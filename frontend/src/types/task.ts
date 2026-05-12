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
