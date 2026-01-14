#!/bin/bash
set -e

# This script checks if the GitLab CLI (glab) is installed and authenticated.

# Check for glab command
if ! command -v glab &> /dev/null; then
    echo "Error: glab CLI is not installed."
    echo ""
    echo "Installation instructions:"
    echo "  macOS:   brew install glab"
    echo "  Linux:   See https://gitlab.com/gitlab-org/cli#installation"
    echo "  Windows: scoop install glab"
    echo ""
    echo "After installation, authenticate with: glab auth login"
    exit 1
fi

# Check for authentication
if ! glab auth status &> /dev/null; then
    echo "Error: glab is not authenticated."
    echo "Please run: glab auth login"
    exit 1
fi

echo "✓ glab is installed and authenticated."
