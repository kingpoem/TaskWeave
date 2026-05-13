import { useEffect, useState } from "react";

import { taskService } from "../services/taskService";
import { defaultSettings, type Settings } from "../types/task";

export function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadSettings() {
      try {
        setSettings(await taskService.getSettings());
      } catch (err) {
        setError(err instanceof Error ? err.message : "加载设置失败");
      }
    }
    void loadSettings();
  }, []);

  async function submitSettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      await taskService.saveSettings({
        uvPath: settings.uvPath.trim() || "uv",
        defaultWorkDir: settings.defaultWorkDir.trim(),
        logRetentionDays: Number(settings.logRetentionDays) || 30,
      });
      setMessage("设置已保存");
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存设置失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <header className="page-header">
        <div>
          <h2>设置</h2>
          <p>配置任务运行环境、日志保留策略和默认工作目录。</p>
        </div>
      </header>

      {message && <p className="notice success">{message}</p>}
      {error && <p className="notice danger">{error}</p>}

      <section className="panel">
        <div className="panel-header compact">
          <div>
            <h3>运行配置</h3>
            <p>这些配置会写入本地配置文件，供后端运行器读取。</p>
          </div>
        </div>
        <form className="task-form" onSubmit={(event) => void submitSettings(event)}>
          <label>
            uv 路径
            <input
              value={settings.uvPath}
              onChange={(event) => setSettings({ ...settings, uvPath: event.target.value })}
              placeholder="uv"
            />
          </label>
          <label>
            默认工作目录
            <input
              value={settings.defaultWorkDir}
              onChange={(event) => setSettings({ ...settings, defaultWorkDir: event.target.value })}
              placeholder="/path/to/workspace"
            />
          </label>
          <label>
            日志保留天数
            <input
              min="1"
              type="number"
              value={settings.logRetentionDays}
              onChange={(event) =>
                setSettings({ ...settings, logRetentionDays: Number(event.target.value) })
              }
            />
          </label>
          <div className="form-actions">
            <button disabled={saving} type="submit">
              {saving ? "保存中..." : "保存设置"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
