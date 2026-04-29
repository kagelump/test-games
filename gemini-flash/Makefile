.PHONY: dev test build clean

PORT ?= 3214

# Placeholder until this showcase matches GAME_DEV.md (vanilla HTML/CSS/JS + assets).

dev:
	python3 -m http.server $(PORT) --directory dist

test:
	@echo "No tests yet"; exit 0

build:
	rm -rf dist
	mkdir -p dist
	printf '%s\n' \
	  '<!DOCTYPE html>' \
	  '<html lang="en">' \
	  '<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />' \
	  '<title>Gemini Flash — coming soon</title>' \
	  '<style>body{font-family:system-ui,sans-serif;max-width:40rem;margin:3rem auto;padding:0 1rem;line-height:1.5}' \
	  'code{font-size:0.95em}</style></head>' \
	  '<body><h1>Gemini Flash one-shot</h1>' \
	  '<p>This slot is reserved for a game built per <code>GAME_DEV.md</code> in this folder.</p>' \
	  '</body></html>' \
	  > dist/index.html

clean:
	rm -rf dist
