# Podman Setup for Solitairey

This Podman Compose setup provides multiple ways to build and run the Solitairey application. Podman is a daemonless container engine that's fully compatible with Docker but runs rootless by default for enhanced security.

## Prerequisites

- Podman (4.0+) - [Installation Guide](https://podman.io/getting-started/installation)
- Podman Compose (1.0+) or use built-in `podman compose`
  - Install via pip: `pip3 install podman-compose`
  - Or use Podman 4.0+ built-in compose support

## Quick Start

### Production Mode

Build and run the production version with nginx serving static files:

```bash
podman-compose up web
# or with built-in compose:
podman compose up web
```

Access the application at: http://localhost:8663

### Development Mode

Run with live file mounting for development:

```bash
podman-compose --profile dev up dev
# or:
podman compose --profile dev up dev
```

Access the application at: http://localhost:8000

The development service will:
1. Install all dependencies
2. Build the project
3. Serve files with a simple HTTP server
4. Mount your local directory for easy development

### Build Only

To just build the project without running a server:

```bash
podman-compose --profile build run --rm builder
# or:
podman compose --profile build run --rm builder
```

The built files will be in the `dest/` directory on your host machine.

## Services

### web (default)
- Multi-stage build creating optimized production image
- Nginx serving pre-built static files
- Port: 8663
- Image size: ~50MB (nginx:alpine + built files)

### dev (profile: dev)
- Development environment with volume mounting
- Automatic rebuild on startup
- Port: 8000
- Hot reload: modify files locally, refresh browser

### builder (profile: build)
- One-off build service
- Outputs to mounted `dest/` directory
- Automatically removes container after build

## Common Commands

```bash
# Build production image
podman-compose build web

# Run production server in background
podman-compose up -d web

# View logs
podman-compose logs -f web

# Stop all services
podman-compose down

# Rebuild from scratch (no cache)
podman-compose build --no-cache web

# Clean up volumes
podman-compose down -v

# List running containers
podman ps

# List all images
podman images
```

## Podman Architecture

### Dockerfile Structure

1. **Builder Stage**: Ruby + Node.js environment
   - Installs build dependencies
   - Runs npm install
   - Executes rake build

2. **Production Stage**: nginx:alpine
   - Copies only built files from builder
   - Minimal final image size
   - Production-ready web server

### Volume Management

- `node_modules` volume: Persists npm packages across builds (dev/builder services)
- Local directory mount: Allows live editing in dev mode

### Rootless by Default

Podman runs containers without root privileges, providing better security:
- No daemon required
- User namespace isolation
- Compatible with systemd for service management

## Troubleshooting

### Git Submodule Issues

If you encounter jStorage errors:

```bash
git submodule update --init --recursive
podman-compose --profile build run --rm builder
```

### Port Conflicts

If ports 8663 or 8000 are already in use, modify `docker-compose.yml`:

```yaml
ports:
  - "YOUR_PORT:80"  # for web service
  - "YOUR_PORT:8000"  # for dev service
```

### Build Failures

Clear cache and rebuild:

```bash
podman-compose down -v
podman-compose build --no-cache
```

### Rootless Permissions

If you encounter permission issues with volumes:

```bash
# Check podman info
podman info

# Fix subuid/subgid mappings (if needed)
podman system migrate
```

### Switching from Docker

If you previously used Docker:

```bash
# Docker images can be imported to Podman
podman pull docker.io/library/nginx:alpine

# Or rebuild with Podman
podman-compose build --no-cache
```

## Environment Customization

Create a `.env` file in the project root for custom configuration:

```env
WEB_PORT=8663
DEV_PORT=8000
```

Update `docker-compose.yml` to use these variables:

```yaml
ports:
  - "${WEB_PORT}:80"
```

## CI/CD Integration

Example GitHub Actions workflow with Podman:

```yaml
- name: Install Podman
  run: |
    sudo apt-get update
    sudo apt-get -y install podman

- name: Build Podman image
  run: podman-compose build web

- name: Test build
  run: podman-compose run --rm builder

- name: Push to registry
  run: |
    podman tag solitairey-web:latest registry.example.com/solitairey:latest
    podman push registry.example.com/solitairey:latest
```

### Using Podman with systemd

Generate systemd service files for automatic container management:

```bash
# Generate service file
podman generate systemd --new --name solitairey-web > ~/.config/systemd/user/solitairey.service

# Enable and start service
systemctl --user enable solitairey.service
systemctl --user start solitairey.service
```

## Performance

- Production image: ~50MB
- Build time: ~2-5 minutes (first build)
- Subsequent builds: ~30 seconds (with cache)
- Rootless execution: no performance penalty

## Security

Podman advantages:
- **Rootless by default**: Containers run as regular users
- **No daemon**: Reduced attack surface
- **SELinux integration**: Enhanced security on RHEL/Fedora
- **Fork-exec model**: Better process isolation

The nginx configuration includes:
- Security headers (X-Frame-Options, X-Content-Type-Options, etc.)
- Gzip compression
- Static asset caching
- Minimal attack surface (alpine base)

## Docker Compatibility

Podman is designed to be Docker-compatible:

```bash
# Use Docker commands with Podman
alias docker=podman
alias docker-compose=podman-compose

# Or create symbolic links
sudo ln -s /usr/bin/podman /usr/bin/docker
```

The same `docker-compose.yml` file works with both Podman and Docker.
