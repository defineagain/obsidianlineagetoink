#!/bin/bash

# Ensure we are in the correct directory
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

# Load GITHUB_TOKEN from .env if it exists
if [ -f .env ]; then
    export $(cat .env | xargs)
fi

echo "Building project binaries for 0.3.9..."
npm run build

if [ $? -ne 0 ]; then
    echo "⚠️ Build failed. Please ensure 'xattr -dr com.apple.provenance node_modules' was run."
    exit 1
fi

echo "Extracting artifacts..."
cp temp/vault/.obsidian/plugins/lineage-dev/main.js main.js
cp temp/vault/.obsidian/plugins/lineage-dev/styles.css styles.css

echo "Creating GitHub Release 0.3.9..."
if [ -z "$GITHUB_TOKEN" ]; then
    echo "⚠️ Warning: GITHUB_TOKEN environment variable is not set. The gh cli might prompt for authentication."
fi

gh release create 0.3.9 main.js manifest.json styles.css \
    --title "0.3.9 - Robust Sidebar & Node Re-parenting" \
    --notes "### Features
- **Robust Sidebar Formatting**: Unified `reformatBlock` logic with exhaustive marker cleanup. Swapping between Knot/Stitch/Choice/Gather is now bulletproof.
- **Improved Node Re-parenting**: Fixed cursor focus and store consistency issues when moving nodes via the 'Make Child of' button.
- **Stability Fixes**: Resolved unused export warnings and accessibility lint issues in Svelte components.
- **In-Vault Help Localization**: Topology Rules help modal now correctly resolves to your local 'Storyflow/' directory."

if [ $? -eq 0 ]; then
    echo "✅ Release 0.3.9 published successfully!"
    echo "Cleaning up local build copies..."
    rm main.js styles.css
else
    echo "❌ Failed to create release. Please check your GitHub token permissions."
fi
