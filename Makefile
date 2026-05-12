WAILS ?= wails
GOOS ?= $(shell go env GOOS)
GOARCH ?= $(shell go env GOARCH)
WAILS_PLATFORM ?= $(GOOS)/$(GOARCH)

.PHONY: run fetch-uv build build-macos build-macos-arm64 build-windows build-linux clean

run:
	$(WAILS) dev

fetch-uv:
	go run ./scripts/fetch-uv.go -goos $(GOOS) -goarch $(GOARCH)

build: fetch-uv
	$(WAILS) build -platform $(WAILS_PLATFORM)

build-macos:
	$(MAKE) build GOOS=darwin GOARCH=amd64

build-macos-arm64:
	$(MAKE) build GOOS=darwin GOARCH=arm64

build-windows:
	$(MAKE) build GOOS=windows GOARCH=amd64

build-linux:
	$(MAKE) build GOOS=linux GOARCH=amd64

ifeq ($(OS),Windows_NT)
clean:
	@if exist frontend\dist rmdir /S /Q frontend\dist
	@if exist bin rmdir /S /Q bin
	@if exist build\bin rmdir /S /Q build\bin
	@if exist build\dist rmdir /S /Q build\dist
	@if exist coverage.out del /Q coverage.out
else
clean:
	@rm -rf frontend/dist bin build/bin build/dist coverage.out
endif
