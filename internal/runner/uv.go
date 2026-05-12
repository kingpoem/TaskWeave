package runner

import (
	"crypto/sha256"
	"embed"
	"encoding/hex"
	"errors"
	"fmt"
	"io/fs"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
)

const defaultUVCommand = "uv"

//go:embed all:assets/uv
var bundledUVFS embed.FS

var (
	extractBundledUVFunc = extractBundledUV
	lookPath             = exec.LookPath
)

func FindUV() (string, error) {
	return ResolveUV("")
}

func ResolveUV(configuredPath string) (string, error) {
	if isExplicitUVPath(configuredPath) {
		return resolveConfiguredUV(configuredPath)
	}

	if bundledPath, err := extractBundledUVFunc(); err == nil {
		return bundledPath, nil
	}

	if path, err := lookPath(defaultUVCommand); err == nil {
		return path, nil
	}

	return "", errors.New("uv executable not found; run scripts/fetch-uv.go before packaging or configure uvPath")
}

func isExplicitUVPath(configuredPath string) bool {
	return configuredPath != "" && configuredPath != defaultUVCommand
}

func resolveConfiguredUV(configuredPath string) (string, error) {
	if hasPathSeparator(configuredPath) {
		info, err := os.Stat(configuredPath)
		if err != nil {
			return "", fmt.Errorf("configured uvPath %q is not available: %w", configuredPath, err)
		}
		if info.IsDir() {
			return "", fmt.Errorf("configured uvPath %q is a directory", configuredPath)
		}
		return configuredPath, nil
	}

	path, err := lookPath(configuredPath)
	if err != nil {
		return "", fmt.Errorf("configured uvPath %q was not found in PATH: %w", configuredPath, err)
	}
	return path, nil
}

func hasPathSeparator(value string) bool {
	return filepath.Base(value) != value
}

func extractBundledUV() (string, error) {
	assetPath := filepath.ToSlash(filepath.Join("assets", "uv", runtime.GOOS+"-"+runtime.GOARCH, executableName()))
	data, err := bundledUVFS.ReadFile(assetPath)
	if err != nil {
		if errors.Is(err, fs.ErrNotExist) {
			return "", fmt.Errorf("bundled uv asset %s is missing", assetPath)
		}
		return "", err
	}

	sum := sha256.Sum256(data)
	digest := hex.EncodeToString(sum[:])
	cacheDir, err := os.UserCacheDir()
	if err != nil {
		return "", err
	}

	targetDir := filepath.Join(cacheDir, "TaskWeave", "uv", runtime.GOOS+"-"+runtime.GOARCH, digest)
	targetPath := filepath.Join(targetDir, executableName())
	if isUsableExecutable(targetPath, digest) {
		return targetPath, nil
	}

	if err := os.MkdirAll(targetDir, 0o755); err != nil {
		return "", err
	}
	if err := os.WriteFile(targetPath, data, executableMode()); err != nil {
		return "", err
	}
	if runtime.GOOS != "windows" {
		if err := os.Chmod(targetPath, executableMode()); err != nil {
			return "", err
		}
	}

	return targetPath, nil
}

func isUsableExecutable(targetPath, digest string) bool {
	data, err := os.ReadFile(targetPath)
	if err != nil {
		return false
	}
	sum := sha256.Sum256(data)
	return hex.EncodeToString(sum[:]) == digest
}

func executableName() string {
	if runtime.GOOS == "windows" {
		return "uv.exe"
	}
	return "uv"
}

func executableMode() os.FileMode {
	if runtime.GOOS == "windows" {
		return 0o644
	}
	return 0o755
}
