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

NOTES="### Ink Architecture Unification
- **Unified Variable Storage**: Eliminated fragmented .inkconfig sidecar files; all variables now live in frontmatter story-logic.
- **4-Tab Sidebar**: Pinned, Recent, Story Logic (structured VAR/CONST editor), Ink Tools (topology buttons, validation, content editor).
- **Variable Badges**: Cards referencing {variable_name} display read-only accent-colored chips in the viewport.
- **Beat Aggregation**: Prose lines correctly aggregate into parent structural nodes during import.
- **Export Pipeline Fix**: story-logic regex handles edge cases (--- fence, underscore keys).
- **Dead Code Removal**: Removed standalone PropertyEditorView and InkBlockEditorView panes."

# Determine which files to include based on existence
FILES="main.js manifest.json"
if [ -f styles.css ]; then
    FILES="$FILES styles.css"
fi

gh release create "$VERSION" $FILES \
    --title "$VERSION - Ink Architecture Unification" \
    --notes "$NOTES"

if [ $? -eq 0 ]; then
    echo "✅ Release $VERSION published successfully!"
    echo "Cleaning up local build copies..."
    rm -f main.js styles.css
else
    echo "❌ Failed to create release. Please check your GitHub token permissions."
fi
