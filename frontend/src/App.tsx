import { useEffect, useState } from "react";

import { WindowFullscreen, WindowIsFullscreen, WindowUnfullscreen } from "../wailsjs/runtime/runtime";
import { RunLogPage } from "./pages/RunLogPage";
import { SettingsPage } from "./pages/SettingsPage";
import { TaskListPage } from "./pages/TaskListPage";

type Theme = "light" | "dark";
type Page = "tasks" | "logs" | "settings";

const navItems: Array<{ id: Page; label: string; meta: string }> = [
  { id: "tasks", label: "任务", meta: "JOBS" },
  { id: "logs", label: "日志", meta: "LOGS" },
  { id: "settings", label: "设置", meta: "CFG" },
];

export default function App() {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem("taskweave.theme");
    return stored === "light" ? "light" : "dark";
  });
  const [activePage, setActivePage] = useState<Page>("tasks");
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("taskweave.theme", theme);
  }, [theme]);

  const nextTheme = theme === "dark" ? "light" : "dark";

  async function toggleFullscreen() {
    try {
      const isFullscreen = await WindowIsFullscreen();
      if (isFullscreen) {
        WindowUnfullscreen();
        setFullscreen(false);
      } else {
        WindowFullscreen();
        setFullscreen(true);
      }
    } catch {
      const next = !fullscreen;
      setFullscreen(next);
      document.documentElement.classList.toggle("browser-fullscreen", next);
    }
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="brand">
            <span className="brand-mark">TW</span>
            <div>
              <p>PYTHON JOB CONTROL</p>
              <h1>TaskWeave</h1>
            </div>
          </div>
          <nav className="sidebar-nav" aria-label="主导航">
            {navItems.map((item) => (
              <button
                className={activePage === item.id ? "active" : ""}
                key={item.id}
                type="button"
                onClick={() => setActivePage(item.id)}
              >
                <span>{item.meta}</span>
                {item.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="sidebar-actions">
          <button className="sidebar-theme-button" type="button" onClick={() => void toggleFullscreen()}>
            {fullscreen ? "退出全屏" : "进入全屏"}
          </button>
          <button
            className="sidebar-theme-button"
            type="button"
            onClick={() => setTheme(nextTheme)}
          >
            {theme === "dark" ? "亮色模式" : "暗色模式"}
          </button>
        </div>
      </aside>
      <section className="content">
        {activePage === "tasks" && <TaskListPage />}
        {activePage === "logs" && <RunLogPage />}
        {activePage === "settings" && <SettingsPage />}
      </section>
    </main>
  );
}
