# Showcase umbrella: every top-level directory except `archive`, `scripts`, `templates`, and `tools` (and generated `site`) is a mini-project with `make build` → dist/

PROJECTS := $(filter-out archive scripts templates tools site site-assets,$(patsubst %/,%,$(wildcard */)))

.PHONY: deps build site clean

.DEFAULT_GOAL := site

deps:
	@set -e; for d in $(PROJECTS); do \
	  if [ -f $$d/package.json ]; then \
	    echo "[deps] $$d"; \
	    (cd $$d && npm ci); \
	  fi; \
	done

build: deps
	@set -e; for d in $(PROJECTS); do \
	  echo "[build] $$d"; \
	  $(MAKE) -C $$d build; \
	done

site: build
	@test -n "$(PROJECTS)" || (echo "No showcase projects found." >&2; exit 1)
	rm -rf site
	mkdir -p site
	@if [ -d site-assets ]; then cp -R site-assets site/; fi
	@set -e; for d in $(PROJECTS); do \
	  echo "[site] $$d"; \
	  mkdir -p site/$$d; \
	  cp -R $$d/dist/. site/$$d/; \
	done
	@PROJECTS="$(PROJECTS)" node tools/generate_site_index.mjs

clean:
	@set -e; for d in $(PROJECTS); do \
	  echo "[clean] $$d"; \
	  $(MAKE) -C $$d clean; \
	done
	rm -rf site
