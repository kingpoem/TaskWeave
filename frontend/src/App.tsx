import { useEffect, useState } from "react";

import { TaskListPage } from "./pages/TaskListPage";

type Theme = "light" | "dark";

export default function App() {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem("taskweave.theme");
    return stored === "dark" ? "dark" : "light";
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("taskweave.theme", theme);
  }, [theme]);

  const nextTheme = theme === "dark" ? "light" : "dark";

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div>
          <h1>TaskWeave</h1>
          <p>Python 定时任务执行管理</p>
        </div>
        <button
          className="ghost-button"
          type="button"
          onClick={() => setTheme(nextTheme)}
        >
          切换到{nextTheme === "dark" ? "黑色" : "白色"}主题
        </button>
      </aside>
      <section className="content">
        <TaskListPage />
      </section>
    </main>
  );
}
