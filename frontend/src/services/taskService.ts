import {
  defaultSettings,
  type RunRecord,
  type Settings,
  type Task,
  type TaskFormValues,
} from "../types/task";

type WailsApp = {
  ListTasks?: () => Promise<Task[]>;
  CreateTask?: (input: TaskFormValues) => Promise<Task>;
  UpdateTask?: (id: string, input: TaskFormValues) => Promise<Task>;
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
    const createTask = window.go?.app?.App?.CreateTask;
    if (createTask) {
      return createTask(input);
    }

    const now = new Date().toISOString();
    const task: Task = {
      ...normalizeInput(input),
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    const tasks = [...readFallbackTasks(), task];
    writeFallbackTasks(tasks);
    return task;
  },

  async updateTask(id: string, input: TaskFormValues): Promise<Task> {
    const updateTask = window.go?.app?.App?.UpdateTask;
    if (updateTask) {
      return updateTask(id, input);
    }

    const tasks = readFallbackTasks();
    const existing = tasks.find((task) => task.id === id);
    if (!existing) {
      throw new Error("任务不存在");
    }

    const updated: Task = {
      ...existing,
      ...normalizeInput(input),
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

function normalizeInput(input: TaskFormValues): Omit<Task, "id" | "createdAt" | "updatedAt"> {
  return {
    name: input.name.trim(),
    type: input.type,
    path: input.path.trim(),
    entry: input.entry.trim() || undefined,
    cron: input.cron.trim(),
    enabled: input.enabled,
    workingDir: input.workingDir.trim() || undefined,
    concurrencyPolicy: input.concurrencyPolicy,
  };
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
