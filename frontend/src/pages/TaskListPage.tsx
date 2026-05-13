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
import { formatDateTime } from "../utils/format";

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

  async function runTask(task: Task) {
    setError("");
    setMessage("");
    try {
      const record = await taskService.runTask(task.id);
      setMessage(`「${task.name}」已运行，结果：${record.status}`);
    } catch (err) {
      setError(errorText(err));
    }
  }

  async function browsePath(mode: "file" | "directory") {
    setError("");
    try {
      const selected =
        mode === "directory"
          ? await taskService.selectDirectoryPath()
          : await taskService.selectFilePath();
      if (selected) {
        setForm({ ...form, path: selected });
      }
    } catch (err) {
      setError(errorText(err));
    }
  }

  function browseDefaultPath() {
    return browsePath(form.type === "directory" ? "directory" : "file");
  }

  const enabledTasks = tasks.filter((task) => task.enabled).length;
  const disabledTasks = tasks.length - enabledTasks;

  return (
    <div>
      <header className="page-header" id="tasks">
        <div>
          <h2>任务列表</h2>
          <p>集中管理 Python 文件、目录任务和 Cron 定时调度。</p>
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
        <StatCard label="已启用" value={enabledTasks} />
        <StatCard label="已停用" value={disabledTasks} />
      </section>

      {message && <p className="notice success">{message}</p>}
      {error && <p className="notice danger">{error}</p>}

      {formOpen && (
        <div className="modal-backdrop" role="presentation">
          <section className="modal-window" aria-modal="true" role="dialog">
            <div className="panel-header">
              <div>
                <h3>{editingTask ? "编辑任务" : "新建任务"}</h3>
                <p>在独立弹窗中保存任务配置，提交后会自动刷新定时调度。</p>
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
                <div className="path-picker">
                  <input
                    value={form.path}
                    onClick={() => void browseDefaultPath()}
                    onChange={(event) => setForm({ ...form, path: event.target.value })}
                    placeholder={
                      form.type === "directory" ? "点击选择任务目录" : "点击选择 Python 文件"
                    }
                  />
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => void browsePath("file")}
                  >
                    浏览文件
                  </button>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => void browsePath("directory")}
                  >
                    浏览目录
                  </button>
                </div>
              </label>

              <label>
                入口文件
                <input
                  value={form.entry}
                  onChange={(event) => setForm({ ...form, entry: event.target.value })}
                  placeholder="目录任务可填，例如 main.py"
                />
              </label>

              <SchedulePicker
                value={form.cron}
                onChange={(cron) => setForm({ ...form, cron })}
              />

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
        </div>
      )}

      {loading && <p className="muted">正在加载任务...</p>}

      {loading ? null : tasks.length === 0 ? (
        <EmptyState onCreate={openCreateForm} />
      ) : (
        <section className="table-panel" aria-label="定时任务列表">
          <div className="table-panel-header">
            <div>
              <h3>定时任务</h3>
              <p>每条任务都可以立即运行、启停、编辑或删除。</p>
            </div>
            <span>{tasks.length} 条记录</span>
          </div>
          <div className="task-table-wrap">
            <table className="task-table">
              <thead>
                <tr>
                  <th>任务名称</th>
                  <th>类型</th>
                  <th>执行计划</th>
                  <th>状态</th>
                  <th>并发策略</th>
                  <th>路径 / 入口</th>
                  <th>更新时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task.id}>
                    <td>
                      <strong>{task.name}</strong>
                      <small>ID：{task.id}</small>
                    </td>
                    <td>{typeLabel(task.type)}</td>
                    <td>{scheduleDescription(task.cron)}</td>
                    <td>
                      <span className={task.enabled ? "status enabled" : "status disabled"}>
                        {task.enabled ? "已启用" : "已停用"}
                      </span>
                    </td>
                    <td>{policyLabel(task.concurrencyPolicy)}</td>
                    <td>
                      <span className="path-cell">{task.path}</span>
                      {task.entry && <small>入口：{task.entry}</small>}
                    </td>
                    <td>{formatDateTime(task.updatedAt)}</td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="secondary-button compact-button"
                          type="button"
                          onClick={() => void runTask(task)}
                        >
                          运行
                        </button>
                        <button
                          className="secondary-button compact-button"
                          type="button"
                          onClick={() => void toggleTask(task)}
                        >
                          {task.enabled ? "停用" : "启用"}
                        </button>
                        <button
                          className="secondary-button compact-button"
                          type="button"
                          onClick={() => openEditForm(task)}
                        >
                          编辑
                        </button>
                        <button
                          className="danger-button compact-button"
                          type="button"
                          onClick={() => void deleteTask(task)}
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
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
    throw new Error("请选择执行计划");
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

type ScheduleMode = "interval" | "daily" | "weekly" | "monthly";
type IntervalUnit = "minute" | "hour" | "day";

type ScheduleConfig = {
  mode: ScheduleMode;
  intervalValue: number;
  intervalUnit: IntervalUnit;
  time: string;
  weekday: string;
  monthDay: number;
};

const defaultSchedule: ScheduleConfig = {
  mode: "interval",
  intervalValue: 1,
  intervalUnit: "hour",
  time: "09:00",
  weekday: "1",
  monthDay: 1,
};

const weekOptions = [
  { value: "1", label: "周一" },
  { value: "2", label: "周二" },
  { value: "3", label: "周三" },
  { value: "4", label: "周四" },
  { value: "5", label: "周五" },
  { value: "6", label: "周六" },
  { value: "0", label: "周日" },
];

const hourOptions = Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, "0"));
const minuteOptions = Array.from({ length: 60 }, (_, minute) => String(minute).padStart(2, "0"));

function SchedulePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (cron: string) => void;
}) {
  const parsed = parseCron(value);
  const schedule = parsed.config;

  function updateSchedule(next: Partial<ScheduleConfig>) {
    onChange(buildCron({ ...schedule, ...next }));
  }

  return (
    <fieldset className="schedule-picker">
      <legend>执行计划</legend>

      <label>
        计划模式
        <select
          value={schedule.mode}
          onChange={(event) => updateSchedule({ mode: event.target.value as ScheduleMode })}
        >
          <option value="interval">按间隔重复</option>
          <option value="daily">每天固定时间</option>
          <option value="weekly">每周固定日期</option>
          <option value="monthly">每月固定日期</option>
        </select>
      </label>

      {schedule.mode === "interval" && (
        <div className="schedule-row">
          <label>
            每隔
            <input
              min={1}
              max={maxIntervalValue(schedule.intervalUnit)}
              type="number"
              value={schedule.intervalValue}
              onChange={(event) =>
                updateSchedule({
                  intervalValue: normalizeNumber(
                    event.target.value,
                    1,
                    maxIntervalValue(schedule.intervalUnit),
                  ),
                })
              }
            />
          </label>
          <label>
            单位
            <select
              value={schedule.intervalUnit}
              onChange={(event) =>
                updateSchedule({
                  intervalUnit: event.target.value as IntervalUnit,
                  intervalValue: 1,
                })
              }
            >
              <option value="minute">分钟</option>
              <option value="hour">小时</option>
              <option value="day">天</option>
            </select>
          </label>
          {schedule.intervalUnit === "day" && (
            <TimeWheelPicker
              label="执行时间"
              value={schedule.time}
              onChange={(time) => updateSchedule({ time })}
            />
          )}
        </div>
      )}

      {schedule.mode === "daily" && (
        <TimeWheelPicker
          label="执行时间"
          value={schedule.time}
          onChange={(time) => updateSchedule({ time })}
        />
      )}

      {schedule.mode === "weekly" && (
        <div className="schedule-row">
          <label>
            每周
            <select
              value={schedule.weekday}
              onChange={(event) => updateSchedule({ weekday: event.target.value })}
            >
              {weekOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <TimeWheelPicker
            label="执行时间"
            value={schedule.time}
            onChange={(time) => updateSchedule({ time })}
          />
        </div>
      )}

      {schedule.mode === "monthly" && (
        <div className="schedule-row">
          <label>
            每月几号
            <input
              min={1}
              max={31}
              type="number"
              value={schedule.monthDay}
              onChange={(event) =>
                updateSchedule({ monthDay: normalizeNumber(event.target.value, 1, 31) })
              }
            />
          </label>
          <TimeWheelPicker
            label="执行时间"
            value={schedule.time}
            onChange={(time) => updateSchedule({ time })}
          />
        </div>
      )}

      <p className="schedule-summary">
        {parsed.matched
          ? scheduleDescription(value)
          : "当前计划不是可视化模式生成的，请重新选择一种执行方式。"}
      </p>
    </fieldset>
  );
}

function TimeWheelPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (time: string) => void;
}) {
  const [rawHour = "09", rawMinute = "00"] = value.split(":");
  const hour = String(normalizeNumber(rawHour, 0, 23)).padStart(2, "0");
  const minute = String(normalizeNumber(rawMinute, 0, 59)).padStart(2, "0");

  return (
    <div className="time-wheel-picker" role="group" aria-label={label}>
      <span>{label}</span>
      <div className="time-wheel-columns">
        <label>
          时
          <select
            aria-label="小时"
            size={5}
            value={hour}
            onChange={(event) => onChange(`${event.target.value}:${minute}`)}
          >
            {hourOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label>
          分
          <select
            aria-label="分钟"
            size={5}
            value={minute}
            onChange={(event) => onChange(`${hour}:${event.target.value}`)}
          >
            {minuteOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}

function parseCron(cron: string): { matched: boolean; config: ScheduleConfig } {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 6 || parts[0] !== "0" || parts[4] !== "*") {
    return { matched: false, config: defaultSchedule };
  }

  const [, minute, hour, dayOfMonth, , weekday] = parts;
  if (minute === "*" && hour === "*" && dayOfMonth === "*" && weekday === "*") {
    return {
      matched: true,
      config: { ...defaultSchedule, intervalUnit: "minute", intervalValue: 1 },
    };
  }

  if (isStep(minute) && hour === "*" && dayOfMonth === "*" && weekday === "*") {
    return {
      matched: true,
      config: {
        ...defaultSchedule,
        intervalUnit: "minute",
        intervalValue: stepValue(minute),
      },
    };
  }

  if (isNumber(minute) && hour === "*" && dayOfMonth === "*" && weekday === "*") {
    return {
      matched: true,
      config: {
        ...defaultSchedule,
        intervalUnit: "hour",
        intervalValue: 1,
      },
    };
  }

  if (isNumber(minute) && isStep(hour) && dayOfMonth === "*" && weekday === "*") {
    return {
      matched: true,
      config: {
        ...defaultSchedule,
        intervalUnit: "hour",
        intervalValue: stepValue(hour),
      },
    };
  }

  if (isNumber(minute) && isNumber(hour) && isStep(dayOfMonth) && weekday === "*") {
    return {
      matched: true,
      config: {
        ...defaultSchedule,
        intervalUnit: "day",
        intervalValue: stepValue(dayOfMonth),
        time: toTime(hour, minute),
      },
    };
  }

  if (isNumber(minute) && isNumber(hour) && dayOfMonth === "*" && weekday === "*") {
    return {
      matched: true,
      config: { ...defaultSchedule, mode: "daily", time: toTime(hour, minute) },
    };
  }

  if (isNumber(minute) && isNumber(hour) && dayOfMonth === "*" && isWeekday(weekday)) {
    return {
      matched: true,
      config: {
        ...defaultSchedule,
        mode: "weekly",
        time: toTime(hour, minute),
        weekday,
      },
    };
  }

  if (isNumber(minute) && isNumber(hour) && isMonthDay(dayOfMonth) && weekday === "*") {
    return {
      matched: true,
      config: {
        ...defaultSchedule,
        mode: "monthly",
        monthDay: Number(dayOfMonth),
        time: toTime(hour, minute),
      },
    };
  }

  return { matched: false, config: defaultSchedule };
}

function buildCron(schedule: ScheduleConfig) {
  const [hour, minute] = schedule.time.split(":");
  const safeHour = normalizeNumber(hour, 0, 23);
  const safeMinute = normalizeNumber(minute, 0, 59);

  if (schedule.mode === "interval") {
    const interval = normalizeNumber(String(schedule.intervalValue), 1, 59);
    if (schedule.intervalUnit === "minute") {
      return `0 */${interval} * * * *`;
    }
    if (schedule.intervalUnit === "hour") {
      return `0 0 */${Math.min(interval, 23)} * * *`;
    }
    return `0 ${safeMinute} ${safeHour} */${Math.min(interval, 31)} * *`;
  }

  if (schedule.mode === "weekly") {
    return `0 ${safeMinute} ${safeHour} * * ${schedule.weekday}`;
  }

  if (schedule.mode === "monthly") {
    return `0 ${safeMinute} ${safeHour} ${normalizeNumber(String(schedule.monthDay), 1, 31)} * *`;
  }

  return `0 ${safeMinute} ${safeHour} * * *`;
}

function scheduleDescription(cron: string) {
  const parsed = parseCron(cron);
  if (!parsed.matched) {
    return "自定义计划";
  }

  const { intervalUnit, intervalValue, mode, monthDay, time, weekday } = parsed.config;
  if (mode === "interval") {
    const unitLabel: Record<IntervalUnit, string> = {
      minute: "分钟",
      hour: "小时",
      day: "天",
    };
    return intervalUnit === "day"
      ? `每隔 ${intervalValue} 天 ${time} 执行`
      : `每隔 ${intervalValue} ${unitLabel[intervalUnit]}执行`;
  }
  if (mode === "weekly") {
    return `每周${weekdayLabel(weekday)} ${time} 执行`;
  }
  if (mode === "monthly") {
    return `每月 ${monthDay} 号 ${time} 执行`;
  }
  return `每天 ${time} 执行`;
}

function normalizeNumber(value: string, min: number, max: number) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return min;
  }
  return Math.min(Math.max(Math.trunc(number), min), max);
}

function isNumber(value: string) {
  return /^\d+$/.test(value);
}

function isStep(value: string) {
  return /^\*\/\d+$/.test(value);
}

function stepValue(value: string) {
  return normalizeNumber(value.replace("*/", ""), 1, 59);
}

function maxIntervalValue(unit: IntervalUnit) {
  if (unit === "minute") {
    return 59;
  }
  if (unit === "hour") {
    return 23;
  }
  return 31;
}

function isWeekday(value: string) {
  return weekOptions.some((option) => option.value === value);
}

function isMonthDay(value: string) {
  return isNumber(value) && Number(value) >= 1 && Number(value) <= 31;
}

function toTime(hour: string, minute: string) {
  return `${String(normalizeNumber(hour, 0, 23)).padStart(2, "0")}:${String(
    normalizeNumber(minute, 0, 59),
  ).padStart(2, "0")}`;
}

function weekdayLabel(value: string) {
  return weekOptions.find((option) => option.value === value)?.label ?? "周一";
}

function errorText(err: unknown) {
  return err instanceof Error ? err.message : "操作失败";
}
