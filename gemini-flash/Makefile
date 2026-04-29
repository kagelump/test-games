dev:
	python3 -m http.server 3214

test:
	npx playwright test

build:
	mkdir -p dist
	cp index.html main.js style.css dist/
	cp -r assets dist/
	# Note: In a real build, we'd strip devCheats here.
	# For this task, we'll keep it simple as per instructions.
