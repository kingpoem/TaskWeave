package scheduler

import (
	"context"
	"sync"

	"github.com/poem/TaskWeave/internal/task"
	"github.com/robfig/cron/v3"
)

type RunFunc func(ctx context.Context, item task.Task)

type Scheduler struct {
	cron    *cron.Cron
	entries map[string]cron.EntryID
	run     RunFunc
	mu      sync.Mutex
}

func New(run RunFunc) *Scheduler {
	return &Scheduler{
		cron:    cron.New(cron.WithSeconds()),
		entries: make(map[string]cron.EntryID),
		run:     run,
	}
}

func (s *Scheduler) Start() {
	s.cron.Start()
}

func (s *Scheduler) Stop() context.Context {
	return s.cron.Stop()
}

func (s *Scheduler) Reload(tasks []task.Task) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	for _, entryID := range s.entries {
		s.cron.Remove(entryID)
	}
	s.entries = make(map[string]cron.EntryID)

	for _, item := range tasks {
		if !item.Enabled {
			continue
		}
		if err := s.scheduleLocked(item); err != nil {
			return err
		}
	}

	return nil
}

func (s *Scheduler) Remove(taskID string) {
	s.mu.Lock()
	defer s.mu.Unlock()

	entryID, ok := s.entries[taskID]
	if !ok {
		return
	}
	s.cron.Remove(entryID)
	delete(s.entries, taskID)
}

func (s *Scheduler) scheduleLocked(item task.Task) error {
	entryID, err := s.cron.AddFunc(item.Cron, func() {
		s.run(context.Background(), item)
	})
	if err != nil {
		return err
	}

	s.entries[item.ID] = entryID
	return nil
}
