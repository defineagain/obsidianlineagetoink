#!/bin/bash

# Ensure we are in the correct directory
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

# Load GITHUB_TOKEN from .env if it exists
if [ -f .env ]; then
    export $(cat .env | xargs)
fi

echo "Building project binaries for 0.3.12..."
npm run build

if [ $? -ne 0 ]; then
    echo "⚠️ Build failed. Please ensure 'xattr -dr com.apple.provenance node_modules' was run."
    exit 1
fi

echo "Extracting artifacts..."
cp temp/vault/.obsidian/plugins/lineage-dev/main.js main.js
cp temp/vault/.obsidian/plugins/lineage-dev/styles.css styles.css

echo "Creating GitHub Release 0.3.12..."
if [ -z "$GITHUB_TOKEN" ]; then
    echo "⚠️ Warning: GITHUB_TOKEN environment variable is not set. The gh cli might prompt for authentication."
fi

# We use single quotes for the notes to prevent shell expansion of backticks
NOTES="### Radical Reset Formatting
- **Zero Markup Leakage**: Rewrote \`reformatBlock\` to follow a 'Radical Reset' strategy—wiping all structural markers and rebuilding from the pure body every time a button is pressed.
- **Improved Content Extraction**: More aggressive cleanup of leading Knot, Stitch, and Weave markers.
- **Stable release process**."

gh release create 0.3.12 main.js manifest.json styles.css \
    --title "0.3.12 - Radical Reset Formatting" \
    --notes "$NOTES"

if [ $? -eq 0 ]; then
    echo "✅ Release 0.3.12 published successfully!"
    echo "Cleaning up local build copies..."
    rm main.js styles.css
else
    echo "❌ Failed to create release. Please check your GitHub token permissions."
fi
