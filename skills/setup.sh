#!/usr/bin/env bash
# Setup script for AI Agent Skills
# Copies AGENTS.md to .github/copilot-instructions.md for GitHub Copilot compatibility

set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AGENTS_MD="$REPO_ROOT/AGENTS.md"
COPILOT_DIR="$REPO_ROOT/.github"
COPILOT_INSTRUCTIONS="$COPILOT_DIR/copilot-instructions.md"

echo "Setting up AI Agent Skills for MyQuota App..."
echo ""

# GitHub Copilot
echo "Configuring GitHub Copilot..."
mkdir -p "$COPILOT_DIR"
cp "$AGENTS_MD" "$COPILOT_INSTRUCTIONS"
echo "  ✓ AGENTS.md -> .github/copilot-instructions.md"

echo ""
echo "Setup complete!"
echo ""
echo "Skills are now available. Run './skills/skill-sync/assets/sync.sh' to update Auto-invoke tables."
