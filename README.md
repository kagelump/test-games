# One-Shot Game Eval — Agentic Brief

> **Purpose of this document:** It is the *only* instruction the agent receives, alongside a 1–2 sentence game idea ("the Prompt"). The same brief is given to every model under evaluation, so the variable being measured is **"How fun a game can this model one-shot?"** — i.e. produce in a single autonomous run with no human in the loop.

> **Core thesis** (from [calebleak.com/posts/dog-game](https://www.calebleak.com/posts/dog-game/)): *the bottleneck in AI-assisted development isn't the quality of your ideas — it's the quality of your feedback loops.* The biggest quality lever in this brief is therefore not creativity prompting — it is **mandatory, aggressive use of the screenshot → playtest → lint → fix loop, with real MCP tool calls (image-gen + browser).** A run that doesn't actually invoke those MCPs is not measuring what we want to measure; the brief halts hard rather than letting that happen silently.

## Repository layout

This repo is a **showcase of different models one-shotting a web game**. Each top-level folder (except `archive`) is its own mini project: run **`make build`** inside that folder to produce a deployable **`dist/`** directory (see [GAME_DEV.md](GAME_DEV.md) for the shared brief).

The **`archive/`** folder is excluded from the umbrella build; everything else that looks like a directory at the repo root is treated as a showcase entry.

## Umbrella Makefile (repo root)

From the repository root:

| Target | What it does |
|--------|----------------|
| **`make`** or **`make site`** | Runs **`make deps`** ( **`npm ci`** in each subfolder that has `package.json` ), builds every showcase project, copies each `dist/` into **`site/<project>/`**, and writes **`site/index.html`** with links to each game. |
| **`make deps`** | Install npm dependencies only. |
| **`make build`** | Dependencies + recursive **`make build`** in each showcase folder. |
| **`make clean`** | Runs each subproject’s **`make clean`** (where defined) and removes **`site/`**. |

Preview the combined site locally after `make site`:

```bash
python3 -m http.server 8080 --directory site
```

Then open `http://localhost:8080/` (landing page) or `http://localhost:8080/<project>/` for a specific game.

## GitHub Pages

After you push to **`main`**, the workflow [`.github/workflows/pages.yml`](.github/workflows/pages.yml) builds with **`make site`** and deploys the **`site/`** output to **GitHub Pages**.

**One-time repository settings:** GitHub → **Settings** → **Pages** → **Build and deployment** → set **Source** to **GitHub Actions** (not “Deploy from a branch”).

For a **project site**, games are served under the repo name, for example:

`https://<username>.github.io/<repository>/`

The landing page is `https://<username>.github.io/<repository>/` and each build is at `https://<username>.github.io/<repository>/<project>/index.html`. Games should keep asset URLs **relative** (no leading `/`) so they load correctly under that base path.

## Publishing this repo on GitHub

If you have not created the remote yet:

```bash
git remote add origin git@github.com:<USER>/<REPO>.git
git branch -M main
git push -u origin main
```

Alternatively, with the [GitHub CLI](https://cli.github.com/): `gh repo create <USER>/<REPO> --source=. --remote=origin --push`.
