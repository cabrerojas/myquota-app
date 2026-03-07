#!/usr/bin/env bash
# Sync auto_invoke metadata from SKILL.md files to AGENTS.md
set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
SKILLS_DIR="$REPO_ROOT/skills"
AGENTS_MD="$REPO_ROOT/AGENTS.md"

echo "Syncing Auto-invoke tables to AGENTS.md..."

# Build the new table content
TABLE_CONTENT="| Action | Skill |
|--------|-------|"

TOTAL=0

# Find all SKILL.md files and extract auto_invoke
for skill_file in "$SKILLS_DIR"/*/SKILL.md; do
  [ -f "$skill_file" ] || continue
  
  skill_name=$(basename "$(dirname "$skill_file")")
  
  # Extract auto_invoke entries from YAML frontmatter
  in_frontmatter=false
  in_auto_invoke=false
  
  while IFS= read -r line; do
    if [[ "$line" == "---" ]]; then
      if $in_frontmatter; then
        break
      else
        in_frontmatter=true
        continue
      fi
    fi
    
    if $in_frontmatter; then
      if [[ "$line" =~ ^[[:space:]]*auto_invoke:[[:space:]]*$ ]]; then
        in_auto_invoke=true
        continue
      fi
      
      if $in_auto_invoke; then
        if [[ "$line" =~ ^[[:space:]]*-[[:space:]]*[\"\']?(.+)[\"\']?$ ]]; then
          action="${BASH_REMATCH[1]}"
          action="${action%\"}"
          action="${action%\'}"
          action="${action#\"}"
          action="${action#\'}"
          if [ -n "$action" ]; then
            TABLE_CONTENT="$TABLE_CONTENT
| $action | \`$skill_name\` |"
            ((TOTAL++)) || true
          fi
        elif [[ ! "$line" =~ ^[[:space:]]+-[[:space:]] ]] && [[ "$line" =~ ^[[:space:]]*[a-z] ]]; then
          in_auto_invoke=false
        fi
      fi
    fi
  done < "$skill_file"
done

# Create the full replacement section
NEW_SECTION="### Auto-invoke Skills

When performing these actions, ALWAYS invoke the corresponding skill FIRST:

$TABLE_CONTENT

<!-- Skills extracted from metadata.auto_invoke in each SKILL.md -->"

# Update AGENTS.md - replace content between markers
if [ -f "$AGENTS_MD" ]; then
  # Use awk to replace the section
  awk -v new_section="$NEW_SECTION" '
    /^### Auto-invoke Skills/ { 
      print new_section
      skip = 1
      next
    }
    /<!-- Skills extracted from metadata.auto_invoke/ {
      skip = 0
      next
    }
    !skip { print }
  ' "$AGENTS_MD" > "$AGENTS_MD.tmp"
  mv "$AGENTS_MD.tmp" "$AGENTS_MD"
  echo "✓ Updated Auto-invoke section in AGENTS.md"
fi

echo "Processed $TOTAL auto-invoke entries from skills."
