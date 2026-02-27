# Ensure we are in the correct directory
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

# Extract version from manifest.json
VERSION=$(grep '"version"' manifest.json | head -1 | sed -E 's/.*"version": "(.*)".*/\1/')

if [ -z "$VERSION" ]; then
    echo "❌ Error: Could not extract version from manifest.json"
    exit 1
fi

# Load GITHUB_TOKEN from .env if it exists
if [ -f .env ]; then
    export $(cat .env | xargs)
fi

echo "Building project binaries for $VERSION..."
npm run build

if [ $? -ne 0 ]; then
    echo "⚠️ Build failed. Please ensure 'xattr -dr com.apple.provenance node_modules' was run."
    exit 1
fi

echo "Extracting artifacts..."
cp temp/vault/.obsidian/plugins/lineage-dev/main.js main.js
# Ink-Lineage 0.4.x uses Svelte 4 with injected CSS, styles.css might be empty or missing
if [ -f temp/vault/.obsidian/plugins/lineage-dev/styles.css ]; then
    cp temp/vault/.obsidian/plugins/lineage-dev/styles.css styles.css
fi

echo "Creating GitHub Release $VERSION..."
if [ -z "$GITHUB_TOKEN" ]; then
    echo "⚠️ Warning: GITHUB_TOKEN environment variable is not set. The gh cli might prompt for authentication."
fi

NOTES='### Sidebar Live Sync Fix (v0.8.3)
- **Regional Sync**: Fixed a critical bug where the Values tab in the sidebar was syncing with the main editor instead of the sidebar player.
- **Context Awareness**: Components now properly prioritize the local story state for live variable updates.
- **Live Sync Refresh**: Fixed an issue where the Values tab would freeze; added 500ms polling to track live `inkjs` updates.
- **Build Quality**: Cleaned up standalone view state errors and accessibility warnings.'

# Determine which files to include based on existence
FILES="main.js manifest.json"
if [ -f styles.css ]; then
    FILES="$FILES styles.css"
fi

# Determine title based on version
if [[ "$VERSION" == "0.8.3" ]]; then
    TITLE="v0.8.3 - Sidebar Sync Fix"
elif [[ "$VERSION" == "0.8.2" ]]; then
    TITLE="v0.8.2 - Variable Consolidation"
elif [[ "$VERSION" == "0.8.1" ]]; then
    TITLE="v0.8.1 - Variable Polish"
elif [[ "$VERSION" == "0.8.0" ]]; then
    TITLE="v0.6.6 - Stability Restoration"
elif [[ "$VERSION" == "0.6.5" ]]; then
    TITLE="v0.6.5 - Deep Debug Diagnostics"
elif [[ "$VERSION" == "0.6.4" ]]; then
    TITLE="v0.6.4 - Ink Modular Support"
elif [[ "$VERSION" == "0.6.3" ]]; then
    TITLE="v0.6.3 - Premium Ink Player"
elif [[ "$VERSION" == "0.6.2" ]]; then
    TITLE="v0.6.2 - Unified Ink Sidebar"
elif [[ "$VERSION" == "0.6.1" ]]; then
    TITLE="v0.6.1 - Ink Import/Export Fidelity"
else
    TITLE="$VERSION - Release"
fi

gh release create "$VERSION" $FILES \
    --title "$TITLE" \
    --notes "$NOTES"

if [ $? -eq 0 ]; then
    echo "✅ Release $VERSION published successfully!"
    echo "Cleaning up local build copies..."
    rm -f main.js styles.css
else
    echo "❌ Failed to create release. Please check your GitHub token permissions."
fi
