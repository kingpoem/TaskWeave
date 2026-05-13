import {
  defaultSettings,
  type RunRecord,
  type Settings,
  type Task,
  type TaskFormValues,
} from "../types/task";

type TaskPayload = Omit<Task, "id" | "createdAt" | "updatedAt">;

type WailsApp = {
  ListTasks?: () => Promise<Task[]>;
  CreateTask?: (input: TaskPayload) => Promise<Task>;
  UpdateTask?: (id: string, input: TaskPayload) => Promise<Task>;
  DeleteTask?: (id: string) => Promise<void>;
  RunTask?: (id: string) => Promise<RunRecord>;
  RecentRuns?: (limit: number) => Promise<RunRecord[]>;
  GetSettings?: () => Promise<Settings>;
  SaveSettings?: (settings: Settings) => Promise<void>;
  SelectFilePath?: () => Promise<string>;
  SelectDirectoryPath?: () => Promise<string>;
};

declare global {
  interface Window {
    go?: {
      app?: {
        App?: WailsApp;
      };
    };
  }
}

const fallbackStorageKey = "taskweave.tasks";
const fallbackRunsKey = "taskweave.runs";
const fallbackSettingsKey = "taskweave.settings";

export const taskService = {
  async listTasks(): Promise<Task[]> {
    const listTasks = window.go?.app?.App?.ListTasks;
    if (listTasks) {
      return listTasks();
    }
    return readFallbackTasks();
  },

  async createTask(input: TaskFormValues): Promise<Task> {
    const payload = normalizeInput(input);
    const createTask = window.go?.app?.App?.CreateTask;
    if (createTask) {
      return createTask(payload);
    }

    const now = new Date().toISOString();
    const task: Task = {
      ...payload,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    writeFallbackTasks([...readFallbackTasks(), task]);
    return task;
  },

  async updateTask(id: string, input: TaskFormValues): Promise<Task> {
    const payload = normalizeInput(input);
    const updateTask = window.go?.app?.App?.UpdateTask;
    if (updateTask) {
      return updateTask(id, payload);
    }

    const tasks = readFallbackTasks();
    const existing = tasks.find((task) => task.id === id);
    if (!existing) {
      throw new Error("任务不存在");
    }

    const updated: Task = {
      ...existing,
      ...payload,
      updatedAt: new Date().toISOString(),
    };
    writeFallbackTasks(tasks.map((task) => (task.id === id ? updated : task)));
    return updated;
  },

  async deleteTask(id: string): Promise<void> {
    const deleteTask = window.go?.app?.App?.DeleteTask;
    if (deleteTask) {
      return deleteTask(id);
    }

    writeFallbackTasks(readFallbackTasks().filter((task) => task.id !== id));
  },

  async runTask(id: string): Promise<RunRecord> {
    const runTask = window.go?.app?.App?.RunTask;
    if (runTask) {
      return runTask(id);
    }

    const task = readFallbackTasks().find((item) => item.id === id);
    if (!task) {
      throw new Error("任务不存在");
    }

    const now = new Date().toISOString();
    const record: RunRecord = {
      id: crypto.randomUUID(),
      taskId: id,
      trigger: "manual",
      status: "success",
      startedAt: now,
      finishedAt: now,
      durationMs: 0,
      exitCode: 0,
      logPath: "浏览器预览模式未生成日志文件",
    };
    writeFallbackRuns([...readFallbackRuns(), record]);
    return record;
  },

  async recentRuns(limit = 50): Promise<RunRecord[]> {
    const recentRuns = window.go?.app?.App?.RecentRuns;
    if (recentRuns) {
      return recentRuns(limit);
    }
    const records = readFallbackRuns();
    return limit > 0 ? records.slice(-limit) : records;
  },

  async getSettings(): Promise<Settings> {
    const getSettings = window.go?.app?.App?.GetSettings;
    if (getSettings) {
      return getSettings();
    }

    const raw = localStorage.getItem(fallbackSettingsKey);
    if (!raw) {
      return defaultSettings;
    }
    try {
      return { ...defaultSettings, ...(JSON.parse(raw) as Settings) };
    } catch {
      return defaultSettings;
    }
  },

  async saveSettings(settings: Settings): Promise<void> {
    const saveSettings = window.go?.app?.App?.SaveSettings;
    if (saveSettings) {
      return saveSettings(settings);
    }
    localStorage.setItem(fallbackSettingsKey, JSON.stringify(settings));
  },

  async selectFilePath(): Promise<string> {
    const selectFilePath = window.go?.app?.App?.SelectFilePath;
    if (selectFilePath) {
      return selectFilePath();
    }
    return "";
  },

  async selectDirectoryPath(): Promise<string> {
    const selectDirectoryPath = window.go?.app?.App?.SelectDirectoryPath;
    if (selectDirectoryPath) {
      return selectDirectoryPath();
    }
    return "";
  },
};

function normalizeInput(input: TaskFormValues): TaskPayload {
  const command = splitCommand(input.commandText);
  const env = parseEnv(input.envText);

  return {
    name: input.name.trim(),
    type: input.type,
    path: input.path.trim(),
    entry: input.entry.trim() || undefined,
    command: command.length > 0 ? command : undefined,
    cron: input.cron.trim(),
    enabled: input.enabled,
    env: Object.keys(env).length > 0 ? env : undefined,
    workingDir: input.workingDir.trim() || undefined,
    concurrencyPolicy: input.concurrencyPolicy,
  };
}

export function commandToText(command?: string[]) {
  return command?.join(" ") ?? "";
}

export function envToText(env?: Record<string, string>) {
  return Object.entries(env ?? {})
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
}

function splitCommand(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return [];
  }
  return trimmed.match(/"[^"]*"|'[^']*'|\S+/g)?.map((part) => part.replace(/^["']|["']$/g, "")) ?? [];
}

function parseEnv(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((env, line) => {
      const index = line.indexOf("=");
      if (index <= 0) {
        return env;
      }
      env[line.slice(0, index).trim()] = line.slice(index + 1).trim();
      return env;
    }, {});
}

function readFallbackTasks(): Task[] {
  const raw = localStorage.getItem(fallbackStorageKey);
  if (!raw) {
    return [];
  }

  try {
    return JSON.parse(raw) as Task[];
  } catch {
    return [];
  }
}

function writeFallbackTasks(tasks: Task[]) {
  localStorage.setItem(fallbackStorageKey, JSON.stringify(tasks));
}

function readFallbackRuns(): RunRecord[] {
  const raw = localStorage.getItem(fallbackRunsKey);
  if (!raw) {
    return [];
  }

  try {
    return JSON.parse(raw) as RunRecord[];
  } catch {
    return [];
  }
}

function writeFallbackRuns(records: RunRecord[]) {
  localStorage.setItem(fallbackRunsKey, JSON.stringify(records));
}
