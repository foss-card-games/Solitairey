[![Build and Publish](https://github.com/slmingol/Solitairey/actions/workflows/docker.yml/badge.svg)](https://github.com/slmingol/Solitairey/actions/workflows/docker.yml)
[![GitHub Release](https://img.shields.io/github/v/release/slmingol/Solitairey?logo=github)](https://github.com/slmingol/Solitairey/releases)
[![Container Image](https://img.shields.io/badge/ghcr.io-slmingol%2Fsolitairey-blue?logo=docker)](https://github.com/slmingol/Solitairey/pkgs/container/solitairey)
[![License](https://img.shields.io/badge/license-BSD--2--Clause-blue)](LICENSE)
[![GitHub Stars](https://img.shields.io/github/stars/slmingol/Solitairey?style=social)](https://github.com/slmingol/Solitairey/stargazers)

# Solitairey

A collection of 18 solitaire card games for the web, built with HTML5 and YUI 3. Playable in any modern browser with no installation required.

**[Play it online](https://foss-card-games.github.io/Solitairey/)**

This is a FOSS fork of the original repository by Paul Harrington, maintained with bug fixes, container support, and CI/CD improvements.

## Games

| Game | Difficulty |
|---|---|
| Agnes | Medium |
| Flower Garden | Medium |
| Forty Thieves | Hard |
| Freecell | Medium |
| Golf | Easy |
| Grandfather's Clock | Easy |
| Klondike | Hard |
| Klondike (Vegas Style) | Hard |
| Monte Carlo | Easy |
| Pyramid | Hard |
| Russian Solitaire | Hard |
| Scorpion | Hard |
| Spider (1, 2, 4 Suit) | Easy–Hard |
| Spiderette | Hard |
| Tri Towers | Easy |
| Will O' The Wisp | Hard |
| Yukon | Medium |

## Quick Start

### Container (recommended)

Requires Podman or Docker.

```bash
# Clone
git clone --recurse-submodules https://github.com/slmingol/Solitairey.git
cd Solitairey

# Build and run (port 8663)
make build
make up
```

Or pull the pre-built image directly from GHCR:

```bash
docker run -p 8663:80 ghcr.io/slmingol/solitairey:latest
```

Access at **http://localhost:8663**

### Traditional Build

Requires Ruby, Node.js, Perl, GraphicsMagick, and libsass.

```bash
bash -ex bin/install-npm-deps.sh
rake
```

Built output lands in `dest/`. Serve it with any static file server.

## Container Commands

All commands use Podman by default; substitute `docker`/`docker-compose` if preferred.

```bash
make build       # Build production image
make up          # Start server on port 8663
make down        # Stop server
make dev         # Start dev server on port 8000 (live source mount)
make rebuild     # Clean rebuild from scratch
make test        # Build-only smoke test
make logs        # Tail server logs
make shell       # Shell into running container
```

See [PODMAN.md](PODMAN.md) for detailed container documentation.

## Development

### Prerequisites

| Tool | Purpose |
|---|---|
| Ruby 3.2+ | Rake build system |
| Node.js 20+ | JS bundling and TypeScript |
| Perl + CPAN | YUI Compressor script |
| GraphicsMagick | Image format conversion |
| libsass (Python) | SCSS compilation |
| Podman or Docker | Container builds |

### Repository Layout

```
src/
  js/          # Game logic (YUI 3 modules)
  ts/          # TypeScript utilities
  scss/        # SCSS stylesheets
  images/      # Web assets (gif, png, jpg, webp)
docker/        # Dockerfile, compose files, nginx config
docs/          # Built output committed for GitHub Pages
dondorf/       # Card face image assets
layouts/       # Game layout images
ext/           # External dependencies (YUI)
bin/           # Build helper scripts
```

### Build Pipeline

`rake` compiles everything into `dest/`:

- `src/scss/solitairey-cards.scss` → `dest/cards.css`
- `src/js/*.js` + `src/ts/*.ts` → `dest/js/`
- `index.erb` → `dest/index.html`
- `src/images/*` → `dest/` (flat copy)

`docs/` is a committed snapshot of `dest/` used for GitHub Pages.

### Versioning

Version is stored in `VERSION` at the repo root. It is stamped into the built
HTML at rake time and displayed in the lower-right corner of the UI.

To release a new version:

```bash
echo "1.2.0" > VERSION
git commit -m "Release v1.2.0" VERSION
git tag -a v1.2.0 -m "Release v1.2.0"
git push origin main --tags
```

The CI pipeline builds and pushes a tagged container image to GHCR automatically.

## Container Images

Images are published to `ghcr.io/slmingol/solitairey` on every tagged release.

| Tag | Description |
|---|---|
| `latest` | Most recent tagged release |
| `1.0.0` | Exact version |
| `1.0` | Minor version |
| `1` | Major version |
| `main` | Latest commit on main |
| `sha-<hash>` | Specific commit |

## License

BSD 2-Clause. Copyright 2011 Paul Harrington. See [LICENSE](LICENSE) for full text.
