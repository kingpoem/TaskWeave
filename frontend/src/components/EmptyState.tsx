type EmptyStateProps = {
  onCreate: () => void;
};

export function EmptyState({ onCreate }: EmptyStateProps) {
  return (
    <section className="empty-state">
      <p className="eyebrow">NO JOBS ONLINE</p>
      <h3>还没有任务</h3>
      <p>创建第一个 Python 任务后，它会出现在这里，并可以手动运行或按计划调度。</p>
      <button type="button" onClick={onCreate}>
        新建任务
      </button>
    </section>
  );
}
