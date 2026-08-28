FROM mcr.microsoft.com/devcontainers/base:bookworm

# Keep this Dockerfile intentionally thin; tooling is installed via devcontainer features.
# Only the search/edit utilities the agent workflow leans on live here.
RUN apt-get update && apt-get install -y --no-install-recommends \
    neovim \
    ripgrep \
    fd-find \
    && rm -rf /var/lib/apt/lists/*

# Debian ships fd as fdfind; give it the name every doc and muscle memory uses.
RUN ln -sf "$(which fdfind)" /usr/local/bin/fd
