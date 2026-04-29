.PHONY: dev test build clean

PORT ?= 3214

dev:
	python3 -m http.server $(PORT) --directory .

test:
	npx playwright test

build:
	rm -rf dist
	mkdir -p dist
	node build.js

clean:
	rm -rf dist node_modules
