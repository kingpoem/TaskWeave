package task

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"strings"
	"time"
)

type Service struct {
	repository *Repository
}

func NewService(repository *Repository) *Service {
	return &Service{repository: repository}
}

func (s *Service) ListTasks(_ context.Context) ([]Task, error) {
	return s.repository.List()
}

func (s *Service) GetTask(_ context.Context, id string) (Task, error) {
	tasks, err := s.repository.List()
	if err != nil {
		return Task{}, err
	}

	for _, item := range tasks {
		if item.ID == id {
			return item, nil
		}
	}

	return Task{}, ErrNotFound
}

func (s *Service) CreateTask(_ context.Context, input Task) (Task, error) {
	if err := validate(input); err != nil {
		return Task{}, err
	}

	now := time.Now()
	input.ID = newID()
	input.CreatedAt = now
	input.UpdatedAt = now
	if input.ConcurrencyPolicy == "" {
		input.ConcurrencyPolicy = ConcurrencySkip
	}

	tasks, err := s.repository.List()
	if err != nil {
		return Task{}, err
	}

	tasks = append(tasks, input)
	if err := s.repository.Save(tasks); err != nil {
		return Task{}, err
	}

	return input, nil
}

func (s *Service) UpdateTask(_ context.Context, id string, input Task) (Task, error) {
	if err := validate(input); err != nil {
		return Task{}, err
	}

	tasks, err := s.repository.List()
	if err != nil {
		return Task{}, err
	}

	for index, item := range tasks {
		if item.ID != id {
			continue
		}

		input.ID = id
		input.CreatedAt = item.CreatedAt
		input.UpdatedAt = time.Now()
		if input.ConcurrencyPolicy == "" {
			input.ConcurrencyPolicy = ConcurrencySkip
		}
		tasks[index] = input

		if err := s.repository.Save(tasks); err != nil {
			return Task{}, err
		}
		return input, nil
	}

	return Task{}, ErrNotFound
}

func (s *Service) DeleteTask(_ context.Context, id string) error {
	tasks, err := s.repository.List()
	if err != nil {
		return err
	}

	next := make([]Task, 0, len(tasks))
	found := false
	for _, item := range tasks {
		if item.ID == id {
			found = true
			continue
		}
		next = append(next, item)
	}
	if !found {
		return ErrNotFound
	}

	return s.repository.Save(next)
}

func validate(input Task) error {
	if strings.TrimSpace(input.Name) == "" {
		return errors.New("task name is required")
	}
	if strings.TrimSpace(input.Path) == "" {
		return errors.New("task path is required")
	}
	if strings.TrimSpace(input.Cron) == "" {
		return errors.New("cron expression is required")
	}
	if input.Type == "" {
		return errors.New("task type is required")
	}
	return nil
}

func newID() string {
	var buffer [16]byte
	if _, err := rand.Read(buffer[:]); err != nil {
		return hex.EncodeToString([]byte(time.Now().Format(time.RFC3339Nano)))
	}
	return hex.EncodeToString(buffer[:])
}
