//go:build ignore

package main

import (
	"archive/tar"
	"archive/zip"
	"bytes"
	"compress/gzip"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"runtime"
	"strings"
	"time"
)

const latestReleaseURL = "https://api.github.com/repos/astral-sh/uv/releases/latest"

type release struct {
	TagName string  `json:"tag_name"`
	Assets  []asset `json:"assets"`
}

type asset struct {
	Name               string `json:"name"`
	BrowserDownloadURL string `json:"browser_download_url"`
}

type manifest struct {
	Version     string `json:"version"`
	GOOS        string `json:"goos"`
	GOARCH      string `json:"goarch"`
	Triple      string `json:"triple"`
	AssetName   string `json:"assetName"`
	DownloadURL string `json:"downloadUrl"`
	SHA256      string `json:"sha256"`
	GeneratedAt string `json:"generatedAt"`
}

func main() {
	goos := flag.String("goos", runtime.GOOS, "target GOOS")
	goarch := flag.String("goarch", runtime.GOARCH, "target GOARCH")
	flag.Parse()

	if err := run(*goos, *goarch); err != nil {
		fmt.Fprintf(os.Stderr, "fetch uv: %v\n", err)
		os.Exit(1)
	}
}

func run(goos, goarch string) error {
	triple, err := targetTriple(goos, goarch)
	if err != nil {
		return err
	}

	rel, err := fetchLatestRelease()
	if err != nil {
		return err
	}

	selected, err := selectAsset(rel.Assets, triple, goos)
	if err != nil {
		return err
	}

	archiveBytes, err := download(selected.BrowserDownloadURL)
	if err != nil {
		return err
	}

	sum := sha256.Sum256(archiveBytes)
	exeName := executableName(goos)
	exeBytes, err := extractExecutable(archiveBytes, selected.Name, exeName)
	if err != nil {
		return err
	}

	if err := cleanEmbeddedAssets(); err != nil {
		return err
	}

	targetDir := filepath.Join("internal", "runner", "assets", "uv", goos+"-"+goarch)
	if err := os.MkdirAll(targetDir, 0o755); err != nil {
		return err
	}

	targetPath := filepath.Join(targetDir, exeName)
	if err := os.WriteFile(targetPath, exeBytes, fileMode(goos)); err != nil {
		return err
	}

	buildDir := filepath.Join("build", "bin", "uv", goos+"-"+goarch)
	if err := os.MkdirAll(buildDir, 0o755); err != nil {
		return err
	}
	if err := os.WriteFile(filepath.Join(buildDir, exeName), exeBytes, fileMode(goos)); err != nil {
		return err
	}

	info := manifest{
		Version:     rel.TagName,
		GOOS:        goos,
		GOARCH:      goarch,
		Triple:      triple,
		AssetName:   selected.Name,
		DownloadURL: selected.BrowserDownloadURL,
		SHA256:      hex.EncodeToString(sum[:]),
		GeneratedAt: time.Now().UTC().Format(time.RFC3339),
	}
	if err := writeManifest(filepath.Join("internal", "runner", "assets", "uv", "manifest.json"), info); err != nil {
		return err
	}
	if err := writeManifest(filepath.Join("build", "bin", "uv", "manifest.json"), info); err != nil {
		return err
	}

	fmt.Printf("Downloaded %s for %s/%s to %s\n", rel.TagName, goos, goarch, targetPath)
	return nil
}

func cleanEmbeddedAssets() error {
	root := filepath.Join("internal", "runner", "assets", "uv")
	entries, err := os.ReadDir(root)
	if errors.Is(err, os.ErrNotExist) {
		return nil
	}
	if err != nil {
		return err
	}

	for _, entry := range entries {
		if entry.Name() == ".gitkeep" {
			continue
		}
		if err := os.RemoveAll(filepath.Join(root, entry.Name())); err != nil {
			return err
		}
	}
	return nil
}

func targetTriple(goos, goarch string) (string, error) {
	switch goos + "/" + goarch {
	case "darwin/amd64":
		return "x86_64-apple-darwin", nil
	case "darwin/arm64":
		return "aarch64-apple-darwin", nil
	case "linux/amd64":
		return "x86_64-unknown-linux-gnu", nil
	case "linux/arm64":
		return "aarch64-unknown-linux-gnu", nil
	case "windows/amd64":
		return "x86_64-pc-windows-msvc", nil
	case "windows/arm64":
		return "aarch64-pc-windows-msvc", nil
	default:
		return "", fmt.Errorf("unsupported uv target %s/%s", goos, goarch)
	}
}

func fetchLatestRelease() (release, error) {
	body, err := download(latestReleaseURL)
	if err != nil {
		return release{}, err
	}

	var rel release
	if err := json.Unmarshal(body, &rel); err != nil {
		return release{}, err
	}
	if rel.TagName == "" {
		return release{}, errors.New("latest release did not include a tag")
	}
	return rel, nil
}

func selectAsset(assets []asset, triple, goos string) (asset, error) {
	wantSuffix := ".tar.gz"
	if goos == "windows" {
		wantSuffix = ".zip"
	}

	wantName := "uv-" + triple + wantSuffix
	for _, item := range assets {
		if item.Name == wantName {
			return item, nil
		}
	}

	return asset{}, fmt.Errorf("release asset %q not found", wantName)
}

func download(url string) ([]byte, error) {
	resp, err := http.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
		return nil, fmt.Errorf("download %s returned %s", url, resp.Status)
	}
	return io.ReadAll(resp.Body)
}

func extractExecutable(archiveBytes []byte, assetName, exeName string) ([]byte, error) {
	if strings.HasSuffix(assetName, ".zip") {
		return extractExecutableFromZip(archiveBytes, exeName)
	}
	return extractExecutableFromTarGz(archiveBytes, exeName)
}

func extractExecutableFromZip(archiveBytes []byte, exeName string) ([]byte, error) {
	reader, err := zip.NewReader(bytes.NewReader(archiveBytes), int64(len(archiveBytes)))
	if err != nil {
		return nil, err
	}

	for _, file := range reader.File {
		if path.Base(file.Name) != exeName {
			continue
		}

		rc, err := file.Open()
		if err != nil {
			return nil, err
		}
		defer rc.Close()
		return io.ReadAll(rc)
	}

	return nil, fmt.Errorf("%s not found in zip archive", exeName)
}

func extractExecutableFromTarGz(archiveBytes []byte, exeName string) ([]byte, error) {
	gzipReader, err := gzip.NewReader(bytes.NewReader(archiveBytes))
	if err != nil {
		return nil, err
	}
	defer gzipReader.Close()

	tarReader := tar.NewReader(gzipReader)
	for {
		header, err := tarReader.Next()
		if errors.Is(err, io.EOF) {
			break
		}
		if err != nil {
			return nil, err
		}
		if path.Base(header.Name) != exeName {
			continue
		}
		return io.ReadAll(tarReader)
	}

	return nil, fmt.Errorf("%s not found in tar.gz archive", exeName)
}

func writeManifest(targetPath string, info manifest) error {
	if err := os.MkdirAll(filepath.Dir(targetPath), 0o755); err != nil {
		return err
	}

	data, err := json.MarshalIndent(info, "", "  ")
	if err != nil {
		return err
	}
	data = append(data, '\n')
	return os.WriteFile(targetPath, data, 0o644)
}

func executableName(goos string) string {
	if goos == "windows" {
		return "uv.exe"
	}
	return "uv"
}

func fileMode(goos string) os.FileMode {
	if goos == "windows" {
		return 0o644
	}
	return 0o755
}
