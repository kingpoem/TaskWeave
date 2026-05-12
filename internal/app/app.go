package app

import (
	"context"
	"sync"

	"github.com/poem/TaskWeave/internal/config"
	"github.com/poem/TaskWeave/internal/logstore"
	"github.com/poem/TaskWeave/internal/platform"
	"github.com/poem/TaskWeave/internal/runner"
	"github.com/poem/TaskWeave/internal/scheduler"
	"github.com/poem/TaskWeave/internal/task"
)

type App struct {
	ctx          context.Context
	taskService  *task.Service
	configStore  *config.Store
	logStore     *logstore.Store
	runner       *runner.Runner
	scheduler    *scheduler.Scheduler
	runningTasks map[string]bool
	mu           sync.Mutex
}

func New() (*App, error) {
	paths, err := platform.ResolvePaths()
	if err != nil {
		return nil, err
	}

	configStore := config.NewStore(paths.Config)
	settings, err := configStore.Load()
	if err != nil {
		return nil, err
	}

	taskService := task.NewService(task.NewRepository(paths.Tasks))
	logStore := logstore.New(paths.Logs, paths.RunIndex)
	uvPath, err := runner.ResolveUV(settings.UVPath)
	if err != nil {
		return nil, err
	}
	uvRunner := runner.New(uvPath)

	application := &App{
		taskService:  taskService,
		configStore:  configStore,
		logStore:     logStore,
		runner:       uvRunner,
		runningTasks: make(map[string]bool),
	}
	application.scheduler = scheduler.New(application.runScheduledTask)

	return application, nil
}

func (a *App) Startup(ctx context.Context) {
	a.ctx = ctx

	tasks, err := a.taskService.ListTasks(ctx)
	if err == nil {
		_ = a.scheduler.Reload(tasks)
	}
	a.scheduler.Start()
}

func (a *App) Shutdown(_ context.Context) {
	a.scheduler.Stop()
}

func (a *App) ListTasks() ([]task.Task, error) {
	return a.taskService.ListTasks(a.context())
}

func (a *App) CreateTask(input task.Task) (task.Task, error) {
	created, err := a.taskService.CreateTask(a.context(), input)
	if err != nil {
		return task.Task{}, err
	}
	return created, a.reloadScheduler()
}

func (a *App) UpdateTask(id string, input task.Task) (task.Task, error) {
	updated, err := a.taskService.UpdateTask(a.context(), id, input)
	if err != nil {
		return task.Task{}, err
	}
	return updated, a.reloadScheduler()
}

func (a *App) DeleteTask(id string) error {
	if err := a.taskService.DeleteTask(a.context(), id); err != nil {
		return err
	}
	a.scheduler.Remove(id)
	return nil
}

func (a *App) RunTask(id string) (task.RunRecord, error) {
	item, err := a.taskService.GetTask(a.context(), id)
	if err != nil {
		return task.RunRecord{}, err
	}
	return a.runTask(a.context(), item, "manual")
}

func (a *App) RecentRuns(limit int) ([]task.RunRecord, error) {
	return a.logStore.RecentRuns(limit)
}

func (a *App) GetSettings() (config.Settings, error) {
	return a.configStore.Load()
}

func (a *App) SaveSettings(settings config.Settings) error {
	return a.configStore.Save(settings)
}

func (a *App) runScheduledTask(ctx context.Context, item task.Task) {
	_, _ = a.runTask(ctx, item, "cron")
}

func (a *App) runTask(ctx context.Context, item task.Task, trigger string) (task.RunRecord, error) {
	if !a.markRunning(item) {
		return task.RunRecord{}, nil
	}
	defer a.unmarkRunning(item.ID)

	result, runErr := a.runner.Run(ctx, item)
	record, writeErr := a.logStore.WriteRun(item.ID, trigger, result)
	if writeErr != nil {
		return task.RunRecord{}, writeErr
	}
	return record, runErr
}

func (a *App) markRunning(item task.Task) bool {
	if item.ConcurrencyPolicy != task.ConcurrencySkip {
		return true
	}

	a.mu.Lock()
	defer a.mu.Unlock()

	if a.runningTasks[item.ID] {
		return false
	}
	a.runningTasks[item.ID] = true
	return true
}

func (a *App) unmarkRunning(taskID string) {
	a.mu.Lock()
	defer a.mu.Unlock()
	delete(a.runningTasks, taskID)
}

func (a *App) reloadScheduler() error {
	tasks, err := a.taskService.ListTasks(a.context())
	if err != nil {
		return err
	}
	return a.scheduler.Reload(tasks)
}

func (a *App) context() context.Context {
	if a.ctx != nil {
		return a.ctx
	}
	return context.Background()
}
