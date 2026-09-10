# Multi-stage build for Solitairey
# Compatible with both Podman and Docker
FROM ruby:3.2-slim as builder

# Install Node.js and build dependencies
RUN apt-get update && apt-get install -y \
    curl \
    git \
    build-essential \
    python3 \
    python3-pip \
    python3-venv \
    perl \
    cpanminus \
    graphicsmagick \
    rsync \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && pip3 install --break-system-packages libsass \
    && cpanm Path::Tiny Getopt::Long File::Temp \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./
COPY bin/install-npm-deps.sh ./bin/

# Clone jStorage dependency (git submodule alternative)
RUN git clone https://github.com/andris9/jStorage jStorage || true

# Install npm dependencies
RUN npm install

# Copy source files
COPY . .

# Ensure tsc is available in PATH
ENV PATH="/app/node_modules/.bin:$PATH"

# Pre-create directory structure to avoid race conditions in parallel rake tasks
RUN mkdir -p dest/js dest/dondorf dest/layouts

# Build the project, stamping the version into the HTML via index.erb
ARG VERSION=dev
RUN echo "${VERSION}" > VERSION && rake

# Production stage - nginx to serve static files
FROM nginx:alpine

# Copy built files from builder
COPY --from=builder /app/dest /usr/share/nginx/html

# Copy nginx configuration
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
