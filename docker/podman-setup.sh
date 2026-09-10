#!/bin/bash
# Setup script for Solitairey Docker environment

set -e

echo "======================================"
echo "Solitairey Podman Setup"
echo "======================================"
echo ""

# Check for Podman
if ! command -v podman &> /dev/null; then
    echo "❌ Podman is not installed. Please install Podman first."
    echo "   Visit: https://podman.io/getting-started/installation"
    exit 1
fi
echo "✅ Podman found: $(podman --version)"

# Check for Podman Compose
if ! command -v podman-compose &> /dev/null; then
    echo "⚠️  podman-compose is not installed. Attempting to use 'podman compose' instead..."
    if ! podman compose version &> /dev/null; then
        echo "❌ Neither podman-compose nor 'podman compose' is available."
        echo "   Install podman-compose: pip3 install podman-compose"
        echo "   Or use Podman 4.0+ with built-in compose support"
        exit 1
    fi
    echo "✅ Using 'podman compose' (built-in)"
    COMPOSE_CMD="podman compose"
else
    echo "✅ Podman Compose found: $(podman-compose --version)"
    COMPOSE_CMD="podman-compose"
fi

echo ""

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from .env.example..."
    cp .env.example .env
    echo "✅ .env file created. You can customize it if needed."
else
    echo "✅ .env file already exists."
fi

echo ""

# Initialize git submodules
echo "📦 Initializing git submodules..."
if [ -d .git ]; then
    git submodule update --init --recursive || echo "⚠️  Warning: Could not initialize submodules"
    echo "✅ Submodules initialized."
else
    echo "⚠️  Not a git repository. Skipping submodule initialization."
fi

echo ""
echo "======================================"
echo "Setup Complete! 🎉"
echo "======================================"
echo ""
echo "Quick Start Commands:"
echo ""
echo "  Production mode (recommended):"
echo "    podman-compose up web"
echo "    (or: podman compose up web)"
echo "    Then visit: http://localhost:8663"
echo ""
echo "  Development mode:"
echo "    podman-compose --profile dev up dev"
echo "    Then visit: http://localhost:8000"
echo ""
echo "  Using Makefile shortcuts:"
echo "    make build    # Build production image"
echo "    make up       # Start production server"
echo "    make dev      # Start development server"
echo "    make help     # Show all available commands"
echo ""
echo "For more information, see PODMAN.md"
echo ""
