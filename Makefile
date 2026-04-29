# Showcase umbrella: every top-level directory except `archive`, `scripts`, `templates`, and `tools` (and generated `site`) is a mini-project with `make build` → dist/

PROJECTS := $(filter-out archive scripts templates tools site,$(patsubst %/,%,$(wildcard */)))

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
	@set -e; for d in $(PROJECTS); do \
	  echo "[site] $$d"; \
	  mkdir -p site/$$d; \
	  cp -R $$d/dist/. site/$$d/; \
	done
	@{ \
	  echo '<!DOCTYPE html>'; \
	  echo '<html lang="en">'; \
	  echo '<head>'; \
	  echo '<meta charset="UTF-8" />'; \
	  echo '<meta name="viewport" content="width=device-width, initial-scale=1" />'; \
	  echo '<title>One-shot game showcase</title>'; \
	  echo '<style>'; \
	  echo 'body{font-family:system-ui,sans-serif;line-height:1.5;max-width:42rem;margin:2.5rem auto;padding:0 1.25rem;color:#111;}'; \
	  echo 'h1{font-size:1.35rem;font-weight:650;}'; \
	  echo 'ul{padding-left:1.1rem;}'; \
	  echo 'a{color:#0b57d0;}'; \
	  echo 'code{font-size:0.92em;}'; \
	  echo '</style>'; \
	  echo '</head><body>'; \
	  echo '<h1>One-shot game showcase</h1>'; \
	  echo '<p>Each entry is a separate model run; assets and code live in that folder.</p>'; \
	  echo '<ul>'; \
	  for d in $(PROJECTS); do \
	    printf '%s\n' "<li><a href=\"$$d/index.html\">$$d</a></li>"; \
	  done; \
	  echo '</ul>'; \
	  echo '</body></html>'; \
	} > site/index.html

clean:
	@set -e; for d in $(PROJECTS); do \
	  echo "[clean] $$d"; \
	  $(MAKE) -C $$d clean; \
	done
	rm -rf site
