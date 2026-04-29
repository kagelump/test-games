.PHONY: dev test build

dev:
	python3 -m http.server 3214

test:
	npx playwright test

build:
	rm -rf dist
	mkdir -p dist/assets
	cp index.html dist/
	cp style.css dist/
	cp main.js dist/main.js.tmp
	grep -v 'devCheats\|window\.devCheats' dist/main.js.tmp > dist/main.js
	rm dist/main.js.tmp
	cp -r assets/* dist/assets/
