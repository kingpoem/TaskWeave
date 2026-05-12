package platform

import (
	"os"
	"path/filepath"
)

type Paths struct {
	DataDir  string
	Config   string
	Tasks    string
	RunIndex string
	Logs     string
}

func ResolvePaths() (Paths, error) {
	configDir, err := os.UserConfigDir()
	if err != nil {
		return Paths{}, err
	}

	dataDir := filepath.Join(configDir, "TaskWeave")
	return Paths{
		DataDir:  dataDir,
		Config:   filepath.Join(dataDir, "config.json"),
		Tasks:    filepath.Join(dataDir, "tasks.json"),
		RunIndex: filepath.Join(dataDir, "run-index.json"),
		Logs:     filepath.Join(dataDir, "logs"),
	}, nil
}
