#!/bin/bash

# Ensure we are in the correct directory
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "Building project binaries for 0.1.1..."
npm run build

if [ $? -ne 0 ]; then
    echo "⚠️ Build failed. Please ensure 'xattr -dr com.apple.provenance node_modules' was run."
    exit 1
fi

echo "Extracting artifacts..."
cp temp/vault/.obsidian/plugins/lineage-dev/main.js main.js
cp temp/vault/.obsidian/plugins/lineage-dev/styles.css styles.css

echo "Creating GitHub Release 0.3.0..."
if [ -z "$GITHUB_TOKEN" ]; then
    echo "⚠️ Warning: GITHUB_TOKEN environment variable is not set. The gh cli might prompt for authentication."
fi

gh release create 0.3.0 main.js manifest.json styles.css \
    --title "v0.3.0 Ink Block Editor & Smart Diverts" \
    --notes "Adds a dedicated Ink Block Editor sidebar for rapid topological tagging (Knots, Stitches, Choices) and implements Smart Diverts to automatically handle narrative flow in the exporter."

if [ $? -eq 0 ]; then
    echo "✅ Release 0.1.1 published successfully!"
    echo "Cleaning up local build copies..."
    rm main.js styles.css
else
    echo "❌ Failed to create release. Please check your GitHub token permissions."
fi
