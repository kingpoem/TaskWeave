import { useEffect, useState } from "react";

import { EmptyState } from "../components/EmptyState";
import { taskService } from "../services/taskService";
import {
  emptyTaskForm,
  type ConcurrencyPolicy,
  type Task,
  type TaskFormValues,
  type TaskType,
} from "../types/task";

export function TaskListPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [form, setForm] = useState<TaskFormValues>(emptyTaskForm);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void loadTasks();
  }, []);

  async function loadTasks() {
    setLoading(true);
    setError("");
    try {
      setTasks(await taskService.listTasks());
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  }

  function openCreateForm() {
    setEditingTask(null);
    setForm(emptyTaskForm);
    setMessage("");
    setError("");
    setFormOpen(true);
  }

  function openEditForm(task: Task) {
    setEditingTask(task);
    setForm({
      name: task.name,
      type: task.type,
      path: task.path,
      entry: task.entry ?? "",
      cron: task.cron,
      enabled: task.enabled,
      workingDir: task.workingDir ?? "",
      concurrencyPolicy: task.concurrencyPolicy,
    });
    setMessage("");
    setError("");
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingTask(null);
    setForm(emptyTaskForm);
  }

  async function submitForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      validateForm(form);
      if (editingTask) {
        await taskService.updateTask(editingTask.id, form);
        setMessage("任务已更新");
      } else {
        await taskService.createTask(form);
        setMessage("任务已创建");
      }
      closeForm();
      await loadTasks();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setSaving(false);
    }
  }

  async function deleteTask(task: Task) {
    if (!confirm(`确定删除任务「${task.name}」吗？`)) {
      return;
    }

    setError("");
    setMessage("");
    try {
      await taskService.deleteTask(task.id);
      setMessage("任务已删除");
      await loadTasks();
    } catch (err) {
      setError(errorText(err));
    }
  }

  async function toggleTask(task: Task) {
    setError("");
    setMessage("");
    try {
      await taskService.updateTask(task.id, {
        name: task.name,
        type: task.type,
        path: task.path,
        entry: task.entry ?? "",
        cron: task.cron,
        enabled: !task.enabled,
        workingDir: task.workingDir ?? "",
        concurrencyPolicy: task.concurrencyPolicy,
      });
      setMessage(task.enabled ? "任务已停用" : "任务已启用");
      await loadTasks();
    } catch (err) {
      setError(errorText(err));
    }
  }

  function runPlaceholder(task: Task) {
    setMessage(`「${task.name}」运行逻辑暂未接入，当前仅保留占位按钮。`);
  }

  return (
    <div>
      <header className="page-header">
        <div>
          <h2>任务列表</h2>
          <p>管理 Python 文件、目录任务和 cron 定时调度。执行逻辑暂时使用占位符。</p>
        </div>
        <div className="header-actions">
          <button className="secondary-button" type="button" onClick={() => void loadTasks()}>
            刷新
          </button>
          <button type="button" onClick={openCreateForm}>
            新建任务
          </button>
        </div>
      </header>

      <section className="stats-grid">
        <StatCard label="全部任务" value={tasks.length} />
        <StatCard label="已启用" value={tasks.filter((task) => task.enabled).length} />
        <StatCard label="已停用" value={tasks.filter((task) => !task.enabled).length} />
      </section>

      {message && <p className="notice success">{message}</p>}
      {error && <p className="notice danger">{error}</p>}

      {formOpen && (
        <section className="panel">
          <div className="panel-header">
            <div>
              <h3>{editingTask ? "编辑任务" : "新建任务"}</h3>
              <p>这里只保存任务配置，Python 可执行检测和依赖初始化后续接入。</p>
            </div>
            <button className="ghost-button" type="button" onClick={closeForm}>
              关闭
            </button>
          </div>

          <form className="task-form" onSubmit={(event) => void submitForm(event)}>
            <label>
              任务名称
              <input
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="例如：每日数据同步"
              />
            </label>

            <label>
              任务类型
              <select
                value={form.type}
                onChange={(event) =>
                  setForm({ ...form, type: event.target.value as TaskType })
                }
              >
                <option value="file">单文件</option>
                <option value="multi_file">多文件</option>
                <option value="directory">目录任务</option>
              </select>
            </label>

            <label>
              文件或目录路径
              <input
                value={form.path}
                onChange={(event) => setForm({ ...form, path: event.target.value })}
                placeholder="/path/to/script.py"
              />
            </label>

            <label>
              入口文件
              <input
                value={form.entry}
                onChange={(event) => setForm({ ...form, entry: event.target.value })}
                placeholder="目录任务可填，例如 main.py"
              />
            </label>

            <label>
              Cron 表达式
              <input
                value={form.cron}
                onChange={(event) => setForm({ ...form, cron: event.target.value })}
                placeholder="0 0 * * * *"
              />
            </label>

            <label>
              工作目录
              <input
                value={form.workingDir}
                onChange={(event) => setForm({ ...form, workingDir: event.target.value })}
                placeholder="留空则使用任务路径推断"
              />
            </label>

            <label>
              并发策略
              <select
                value={form.concurrencyPolicy}
                onChange={(event) =>
                  setForm({
                    ...form,
                    concurrencyPolicy: event.target.value as ConcurrencyPolicy,
                  })
                }
              >
                <option value="skip">上次未结束则跳过</option>
                <option value="queue">排队执行</option>
                <option value="allow">允许并发</option>
              </select>
            </label>

            <label className="checkbox-row">
              <input
                checked={form.enabled}
                type="checkbox"
                onChange={(event) => setForm({ ...form, enabled: event.target.checked })}
              />
              启用任务
            </label>

            <div className="form-actions">
              <button className="secondary-button" type="button" onClick={closeForm}>
                取消
              </button>
              <button disabled={saving} type="submit">
                {saving ? "保存中..." : editingTask ? "保存修改" : "创建任务"}
              </button>
            </div>
          </form>
        </section>
      )}

      {loading && <p className="muted">正在加载任务...</p>}

      {tasks.length === 0 ? (
        !loading && <EmptyState onCreate={openCreateForm} />
      ) : (
        <div className="task-grid">
          {tasks.map((task) => (
            <article className="task-card" key={task.id}>
              <div className="task-card-header">
                <div>
                  <h3>{task.name}</h3>
                  <p>{task.path}</p>
                </div>
                <span className={task.enabled ? "status enabled" : "status disabled"}>
                  {task.enabled ? "已启用" : "已停用"}
                </span>
              </div>

              <dl className="task-meta">
                <div>
                  <dt>类型</dt>
                  <dd>{typeLabel(task.type)}</dd>
                </div>
                <div>
                  <dt>Cron</dt>
                  <dd>{task.cron}</dd>
                </div>
                <div>
                  <dt>并发</dt>
                  <dd>{policyLabel(task.concurrencyPolicy)}</dd>
                </div>
              </dl>

              {task.entry && <p className="muted">入口：{task.entry}</p>}

              <div className="card-actions">
                <button className="secondary-button" type="button" onClick={() => runPlaceholder(task)}>
                  运行
                </button>
                <button className="secondary-button" type="button" onClick={() => void toggleTask(task)}>
                  {task.enabled ? "停用" : "启用"}
                </button>
                <button className="secondary-button" type="button" onClick={() => openEditForm(task)}>
                  编辑
                </button>
                <button className="danger-button" type="button" onClick={() => void deleteTask(task)}>
                  删除
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function validateForm(form: TaskFormValues) {
  if (!form.name.trim()) {
    throw new Error("请输入任务名称");
  }
  if (!form.path.trim()) {
    throw new Error("请输入文件或目录路径");
  }
  if (!form.cron.trim()) {
    throw new Error("请输入 Cron 表达式");
  }
  if (form.type === "directory" && !form.entry.trim()) {
    throw new Error("目录任务需要填写入口文件");
  }
}

function typeLabel(type: TaskType) {
  const labels: Record<TaskType, string> = {
    file: "单文件",
    multi_file: "多文件",
    directory: "目录任务",
  };
  return labels[type];
}

function policyLabel(policy: ConcurrencyPolicy) {
  const labels: Record<ConcurrencyPolicy, string> = {
    skip: "跳过",
    queue: "排队",
    allow: "并发",
  };
  return labels[policy];
}

function errorText(err: unknown) {
  return err instanceof Error ? err.message : "操作失败";
}
