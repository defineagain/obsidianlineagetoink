#!/bin/bash

# Ensure we are in the correct directory
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

# Load GITHUB_TOKEN from .env if it exists
if [ -f .env ]; then
    export $(cat .env | xargs)
fi

echo "Building project binaries for 0.3.8..."
npm run build

if [ $? -ne 0 ]; then
    echo "⚠️ Build failed. Please ensure 'xattr -dr com.apple.provenance node_modules' was run."
    exit 1
fi

echo "Extracting artifacts..."
cp temp/vault/.obsidian/plugins/lineage-dev/main.js main.js
cp temp/vault/.obsidian/plugins/lineage-dev/styles.css styles.css

echo "Creating GitHub Release 0.3.8..."
if [ -z "$GITHUB_TOKEN" ]; then
    echo "⚠️ Warning: GITHUB_TOKEN environment variable is not set. The gh cli might prompt for authentication."
fi

gh release create 0.3.8 main.js manifest.json styles.css \
    --title "0.3.8 - Sidebar Selections & Editable Preview" \
    --notes "### Features
- **Editable Sidebar Editor**: Directly sync card content from the sidebar with auto-save to the main Lineage card.
- **Topology Check**: One-click 'Parse & Check' to validate your card against Ink-Lineage authoring rules.
- **'Make Child of...'**: New action button to instantly re-parent the current card to any other card in the document.
- **In-Vault Help**: The Topology Rules help modal now pulls documentation directly from your vault's 'Storyflow/' folder."

if [ $? -eq 0 ]; then
    echo "✅ Release 0.3.8 published successfully!"
    echo "Cleaning up local build copies..."
    rm main.js styles.css
else
    echo "❌ Failed to create release. Please check your GitHub token permissions."
fi
