#!/bin/bash

# Ensure we are in the correct directory
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

# Load GITHUB_TOKEN from .env if it exists
if [ -f .env ]; then
    export $(cat .env | xargs)
fi

echo "Building project binaries for 0.3.7..."
npm run build

if [ $? -ne 0 ]; then
    echo "⚠️ Build failed. Please ensure 'xattr -dr com.apple.provenance node_modules' was run."
    exit 1
fi

echo "Extracting artifacts..."
cp temp/vault/.obsidian/plugins/lineage-dev/main.js main.js
cp temp/vault/.obsidian/plugins/lineage-dev/styles.css styles.css

echo "Creating GitHub Release 0.3.7..."
if [ -z "$GITHUB_TOKEN" ]; then
    echo "⚠️ Warning: GITHUB_TOKEN environment variable is not set. The gh cli might prompt for authentication."
fi

gh release create 0.3.7 main.js manifest.json styles.css \
    --title "0.3.7 - Ink Topology & Authoring Rules" \
    --notes "### Features
- **Formal Topology Rules**: Column 1 is now Knot, Column 2 is Stitch, Column 3+ is Weave.
- **Choice Safety**: Choices without children automatically append '-> END' to prevent compilation hangs.
- **Sidebar Help Modal**: Added a 'See Topology Rules' button that displays full authoring guidelines.
- **Auto-Titling**: Stabilized Knot/Stitch identifiers derived from H1 headers for reliable targeting."

if [ $? -eq 0 ]; then
    echo "✅ Release 0.3.7 published successfully!"
    echo "Cleaning up local build copies..."
    rm main.js styles.css
else
    echo "❌ Failed to create release. Please check your GitHub token permissions."
fi
