export function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function statusLabel(status: string) {
  const labels: Record<string, string> = {
    running: "运行中",
    success: "成功",
    failed: "失败",
    canceled: "已取消",
    skipped: "已跳过",
  };
  return labels[status] ?? status;
}
