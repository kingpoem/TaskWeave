package task

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"sync"
)

var ErrNotFound = errors.New("task not found")

type Repository struct {
	path string
	mu   sync.RWMutex
}

func NewRepository(path string) *Repository {
	return &Repository{path: path}
}

func (r *Repository) List() ([]Task, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	return r.read()
}

func (r *Repository) Save(tasks []Task) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if err := os.MkdirAll(filepath.Dir(r.path), 0o755); err != nil {
		return err
	}

	data, err := json.MarshalIndent(tasks, "", "  ")
	if err != nil {
		return err
	}

	tmpPath := r.path + ".tmp"
	if err := os.WriteFile(tmpPath, data, 0o644); err != nil {
		return err
	}

	return os.Rename(tmpPath, r.path)
}

func (r *Repository) read() ([]Task, error) {
	data, err := os.ReadFile(r.path)
	if errors.Is(err, os.ErrNotExist) {
		return []Task{}, nil
	}
	if err != nil {
		return nil, err
	}
	if len(data) == 0 {
		return []Task{}, nil
	}

	var tasks []Task
	if err := json.Unmarshal(data, &tasks); err != nil {
		return nil, err
	}

	return tasks, nil
}
