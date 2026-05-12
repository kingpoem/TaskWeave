package config

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
)

type Settings struct {
	UVPath           string `json:"uvPath"`
	DefaultWorkDir   string `json:"defaultWorkDir"`
	LogRetentionDays int    `json:"logRetentionDays"`
}

type Store struct {
	path string
}

func NewStore(path string) *Store {
	return &Store{path: path}
}

func (s *Store) Load() (Settings, error) {
	data, err := os.ReadFile(s.path)
	if errors.Is(err, os.ErrNotExist) {
		return DefaultSettings(), nil
	}
	if err != nil {
		return Settings{}, err
	}
	if len(data) == 0 {
		return DefaultSettings(), nil
	}

	var settings Settings
	if err := json.Unmarshal(data, &settings); err != nil {
		return Settings{}, err
	}

	return settings, nil
}

func (s *Store) Save(settings Settings) error {
	if err := os.MkdirAll(filepath.Dir(s.path), 0o755); err != nil {
		return err
	}

	data, err := json.MarshalIndent(settings, "", "  ")
	if err != nil {
		return err
	}

	tmpPath := s.path + ".tmp"
	if err := os.WriteFile(tmpPath, data, 0o644); err != nil {
		return err
	}

	return os.Rename(tmpPath, s.path)
}

func DefaultSettings() Settings {
	return Settings{
		UVPath:           "uv",
		LogRetentionDays: 30,
	}
}
