import type { Task, TaskFormValues } from "../types/task";

type WailsApp = {
  ListTasks?: () => Promise<Task[]>;
  CreateTask?: (input: TaskFormValues) => Promise<Task>;
  UpdateTask?: (id: string, input: TaskFormValues) => Promise<Task>;
  DeleteTask?: (id: string) => Promise<void>;
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
