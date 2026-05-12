type EmptyStateProps = {
  onCreate: () => void;
};

export function EmptyState({ onCreate }: EmptyStateProps) {
  return (
    <section className="empty-state">
      <h3>还没有任务</h3>
      <p>创建第一个 Python 定时任务后，它会显示在这里。</p>
      <button type="button" onClick={onCreate}>
        创建任务
      </button>
    </section>
  );
}
