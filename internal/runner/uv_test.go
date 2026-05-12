package runner

import (
	"errors"
	"os"
	"path/filepath"
	"testing"
)

func TestResolveUVUsesConfiguredPath(t *testing.T) {
	uvPath := filepath.Join(t.TempDir(), executableName())
	if err := os.WriteFile(uvPath, []byte("uv"), executableMode()); err != nil {
		t.Fatal(err)
	}

	resolved, err := ResolveUV(uvPath)
	if err != nil {
		t.Fatalf("ResolveUV returned error: %v", err)
	}
	if resolved != uvPath {
		t.Fatalf("ResolveUV returned %q, want %q", resolved, uvPath)
	}
}

func TestResolveUVUsesBundledBeforePathDefault(t *testing.T) {
	restore := stubUVResolution(t, "/bundled/uv", "/path/uv", nil, nil)
	defer restore()

	resolved, err := ResolveUV(defaultUVCommand)
	if err != nil {
		t.Fatalf("ResolveUV returned error: %v", err)
	}
	if resolved != "/bundled/uv" {
		t.Fatalf("ResolveUV returned %q, want bundled uv", resolved)
	}
}

func TestResolveUVFallsBackToPath(t *testing.T) {
	restore := stubUVResolution(t, "", "/path/uv", errors.New("missing bundled uv"), nil)
	defer restore()

	resolved, err := ResolveUV("")
	if err != nil {
		t.Fatalf("ResolveUV returned error: %v", err)
	}
	if resolved != "/path/uv" {
		t.Fatalf("ResolveUV returned %q, want PATH uv", resolved)
	}
}

func TestResolveUVReportsMissingUV(t *testing.T) {
	restore := stubUVResolution(t, "", "", errors.New("missing bundled uv"), errors.New("missing PATH uv"))
	defer restore()

	if _, err := ResolveUV(""); err == nil {
		t.Fatal("ResolveUV returned nil error for missing uv")
	}
}

func stubUVResolution(t *testing.T, bundledPath, pathResult string, bundledErr, pathErr error) func() {
	t.Helper()

	originalBundled := extractBundledUVFunc
	originalLookPath := lookPath

	extractBundledUVFunc = func() (string, error) {
		return bundledPath, bundledErr
	}
	lookPath = func(string) (string, error) {
		return pathResult, pathErr
	}

	return func() {
		extractBundledUVFunc = originalBundled
		lookPath = originalLookPath
	}
}
