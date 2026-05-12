package runner

import (
	"bytes"
	"context"
	"errors"
	"os"
	"os/exec"
	"path/filepath"
	"time"

	"github.com/poem/TaskWeave/internal/task"
)

type Result struct {
	StartedAt    time.Time
	FinishedAt   time.Time
	Duration     time.Duration
	ExitCode     int
	Stdout       string
	Stderr       string
	ErrorSummary string
	Status       task.RunStatus
}

type Runner struct {
	uvPath string
}

func New(uvPath string) *Runner {
	if uvPath == "" {
		uvPath = defaultUVCommand
	}
	return &Runner{uvPath: uvPath}
}

func (r *Runner) Run(ctx context.Context, item task.Task) (Result, error) {
	startedAt := time.Now()
	commandName, args := r.commandFor(item)

	cmd := exec.CommandContext(ctx, commandName, args...)
	cmd.Dir = workingDirFor(item)
	cmd.Env = append(os.Environ(), envList(item.Env)...)

	var stdout bytes.Buffer
	var stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err := cmd.Run()
	finishedAt := time.Now()
	result := Result{
		StartedAt:  startedAt,
		FinishedAt: finishedAt,
		Duration:   finishedAt.Sub(startedAt),
		Stdout:     stdout.String(),
		Stderr:     stderr.String(),
		Status:     task.RunStatusSuccess,
	}

	if err != nil {
		result.Status = task.RunStatusFailed
		result.ErrorSummary = err.Error()

		var exitErr *exec.ExitError
		if errors.As(err, &exitErr) {
			result.ExitCode = exitErr.ExitCode()
		} else if errors.Is(ctx.Err(), context.Canceled) {
			result.Status = task.RunStatusCanceled
			result.ExitCode = -1
		} else {
			result.ExitCode = -1
		}

		return result, err
	}

	return result, nil
}

func (r *Runner) commandFor(item task.Task) (string, []string) {
	if len(item.Command) > 0 {
		return item.Command[0], item.Command[1:]
	}

	target := item.Path
	if item.Type == task.TypeDirectory && item.Entry != "" {
		target = filepath.Join(item.Path, item.Entry)
	}

	return r.uvPath, []string{"run", "python", target}
}

func workingDirFor(item task.Task) string {
	if item.WorkingDir != "" {
		return item.WorkingDir
	}
	if item.Type == task.TypeDirectory {
		return item.Path
	}
	return filepath.Dir(item.Path)
}

func envList(values map[string]string) []string {
	env := make([]string, 0, len(values))
	for key, value := range values {
		env = append(env, key+"="+value)
	}
	return env
}
