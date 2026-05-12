package task

import "time"

type Type string

const (
	TypeFile      Type = "file"
	TypeMultiFile Type = "multi_file"
	TypeDirectory Type = "directory"
)

type ConcurrencyPolicy string

const (
	ConcurrencySkip  ConcurrencyPolicy = "skip"
	ConcurrencyQueue ConcurrencyPolicy = "queue"
	ConcurrencyAllow ConcurrencyPolicy = "allow"
)

type Task struct {
	ID                string            `json:"id"`
	Name              string            `json:"name"`
	Type              Type              `json:"type"`
	Path              string            `json:"path"`
	Entry             string            `json:"entry,omitempty"`
	Command           []string          `json:"command,omitempty"`
	Cron              string            `json:"cron"`
	Enabled           bool              `json:"enabled"`
	Env               map[string]string `json:"env,omitempty"`
	WorkingDir        string            `json:"workingDir,omitempty"`
	ConcurrencyPolicy ConcurrencyPolicy `json:"concurrencyPolicy"`
	CreatedAt         time.Time         `json:"createdAt"`
	UpdatedAt         time.Time         `json:"updatedAt"`
}

type RunStatus string

const (
	RunStatusRunning  RunStatus = "running"
	RunStatusSuccess  RunStatus = "success"
	RunStatusFailed   RunStatus = "failed"
	RunStatusCanceled RunStatus = "canceled"
	RunStatusSkipped  RunStatus = "skipped"
)

type RunRecord struct {
	ID           string    `json:"id"`
	TaskID       string    `json:"taskId"`
	Trigger      string    `json:"trigger"`
	Status       RunStatus `json:"status"`
	StartedAt    time.Time `json:"startedAt"`
	FinishedAt   time.Time `json:"finishedAt"`
	DurationMS   int64     `json:"durationMs"`
	ExitCode     int       `json:"exitCode"`
	LogPath      string    `json:"logPath"`
	ErrorSummary string    `json:"errorSummary,omitempty"`
}
