import { useEffect, useState } from "react";

import { taskService } from "../services/taskService";
import type { RunRecord } from "../types/task";
import { formatDateTime, statusLabel } from "../utils/format";

export function RunLogPage() {
  const [runs, setRuns] = useState<RunRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadRuns() {
    setLoading(true);
    setError("");
    try {
      setRuns(await taskService.recentRuns(100));
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载运行日志失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRuns();
  }, []);

  return (
    <div>
      <header className="page-header">
        <div>
          <h2>运行日志</h2>
          <p>查看手动执行和定时调度产生的最近 100 条运行记录。</p>
        </div>
        <button className="secondary-button" type="button" onClick={() => void loadRuns()}>
          刷新
        </button>
      </header>

      {error && <p className="notice danger">{error}</p>}
      {loading && <p className="muted">正在加载日志...</p>}

      {!loading && (
        <section className="table-panel" aria-label="运行日志列表">
          <div className="table-panel-header">
            <div>
              <h3>运行记录</h3>
              <p>包含触发方式、结果、耗时、退出码和日志文件位置。</p>
            </div>
            <span>{runs.length} 条记录</span>
          </div>
          <div className="task-table-wrap">
            <table className="task-table">
              <thead>
                <tr>
                  <th>运行 ID</th>
                  <th>任务 ID</th>
                  <th>触发方式</th>
                  <th>状态</th>
                  <th>开始时间</th>
                  <th>耗时</th>
                  <th>退出码</th>
                  <th>日志路径</th>
                </tr>
              </thead>
              <tbody>
                {runs.length === 0 ? (
                  <tr>
                    <td colSpan={8}>暂无运行记录。</td>
                  </tr>
                ) : (
                  [...runs].reverse().map((run) => (
                    <tr key={run.id}>
                      <td>
                        <strong>{run.id}</strong>
                        {run.errorSummary && <small>{run.errorSummary}</small>}
                      </td>
                      <td>{run.taskId}</td>
                      <td>{run.trigger === "cron" ? "定时" : "手动"}</td>
                      <td>
                        <span className={`status ${run.status === "success" ? "enabled" : "disabled"}`}>
                          {statusLabel(run.status)}
                        </span>
                      </td>
                      <td>{formatDateTime(run.startedAt)}</td>
                      <td>{run.durationMs} ms</td>
                      <td>{run.exitCode}</td>
                      <td>
                        <span className="path-cell">{run.logPath}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
