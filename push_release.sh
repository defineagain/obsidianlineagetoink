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

NOTES="### Unified Ink Sidebar (v0.6.2)
- **Tabbing Interface**: The Ink Block Editor and Ink Player (Presentation) are now unified into a single sidebar view with tabs.
- **Workflow Persistence**: Switching between editing and previewing no longer replaces the sidebar leaf, preventing the pane from \"disappearing\".
- **Command-Aware Activation**: Running the \"Open Presentation View\" command automatically switches the unified sidebar to the Player tab.
- **Ribbon Integration**: The ribbon icon now opens the unified sidebar and defaults to the Editor tab."

# Determine which files to include based on existence
FILES="main.js manifest.json"
if [ -f styles.css ]; then
    FILES="$FILES styles.css"
fi

# Determine title based on version
if [[ "$VERSION" == "0.6.2" ]]; then
    TITLE="v0.6.2 - Unified Ink Sidebar"
elif [[ "$VERSION" == "0.6.1" ]]; then
    TITLE="v0.6.1 - Ink Import/Export Fidelity"
else
    TITLE="$VERSION - Unified Variable Registry"
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
