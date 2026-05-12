package logstore

import (
	"encoding/json"
	"os"
	"path/filepath"
	"time"

	"github.com/poem/TaskWeave/internal/runner"
	"github.com/poem/TaskWeave/internal/task"
)

type Store struct {
	root      string
	indexPath string
}

func New(root string, indexPath string) *Store {
	return &Store{root: root, indexPath: indexPath}
}

func (s *Store) WriteRun(taskID string, trigger string, result runner.Result) (task.RunRecord, error) {
	runID := time.Now().Format("20060102T150405.000000000")
	dir := filepath.Join(s.root, "task-runs", taskID, time.Now().Format("2006-01-02"))
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return task.RunRecord{}, err
	}

	logPath := filepath.Join(dir, runID+".log")
	content := []byte("stdout:\n" + result.Stdout + "\n\nstderr:\n" + result.Stderr)
	if err := os.WriteFile(logPath, content, 0o644); err != nil {
		return task.RunRecord{}, err
	}

	record := task.RunRecord{
		ID:           runID,
		TaskID:       taskID,
		Trigger:      trigger,
		Status:       result.Status,
		StartedAt:    result.StartedAt,
		FinishedAt:   result.FinishedAt,
		DurationMS:   result.Duration.Milliseconds(),
		ExitCode:     result.ExitCode,
		LogPath:      logPath,
		ErrorSummary: result.ErrorSummary,
	}

	return record, s.appendIndex(record)
}

func (s *Store) RecentRuns(limit int) ([]task.RunRecord, error) {
	records, err := s.readIndex()
	if err != nil {
		return nil, err
	}
	if limit <= 0 || len(records) <= limit {
		return records, nil
	}
	return records[len(records)-limit:], nil
}

func (s *Store) appendIndex(record task.RunRecord) error {
	records, err := s.readIndex()
	if err != nil {
		return err
	}
	records = append(records, record)

	if err := os.MkdirAll(filepath.Dir(s.indexPath), 0o755); err != nil {
		return err
	}

	data, err := json.MarshalIndent(records, "", "  ")
	if err != nil {
		return err
	}

	tmpPath := s.indexPath + ".tmp"
	if err := os.WriteFile(tmpPath, data, 0o644); err != nil {
		return err
	}
	return os.Rename(tmpPath, s.indexPath)
}

func (s *Store) readIndex() ([]task.RunRecord, error) {
	data, err := os.ReadFile(s.indexPath)
	if os.IsNotExist(err) {
		return []task.RunRecord{}, nil
	}
	if err != nil {
		return nil, err
	}
	if len(data) == 0 {
		return []task.RunRecord{}, nil
	}

	var records []task.RunRecord
	if err := json.Unmarshal(data, &records); err != nil {
		return nil, err
	}
	return records, nil
}
