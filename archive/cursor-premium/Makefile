PORT := 3214
DIST := dist

.PHONY: dev test build clean

dev:
	python3 -m http.server $(PORT)

test:
	python3 -m http.server $(PORT) >/tmp/cursor-premium-test-server.log 2>&1 & SERVER_PID=$$!; \
	node tests/run-tests.js; \
	TEST_EXIT=$$?; \
	kill $$SERVER_PID >/dev/null 2>&1 || true; \
	exit $$TEST_EXIT

build: clean
	mkdir -p $(DIST) $(DIST)/assets
	cp index.html style.css README.md $(DIST)/
	cp -R assets/* $(DIST)/assets/ 2>/dev/null || true
	awk 'BEGIN{skip=0} /DEV_CHEATS_START/{skip=1; next} /DEV_CHEATS_END/{skip=0; next} skip==0{print}' main.js > $(DIST)/main.js
	printf "\nwindow.devCheats = undefined;\n" >> $(DIST)/main.js

clean:
	rm -rf $(DIST)
