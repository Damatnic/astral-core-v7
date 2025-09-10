#!/bin/bash

# Script to replace all console.log statements with proper logging
# in the Astral Core v7 project

echo "Starting console.log replacement..."

# Add logger imports to files that need it
files_with_console=$(grep -r "console\." src --include="*.ts" --include="*.tsx" -l)

for file in $files_with_console; do
  echo "Processing: $file"
  
  # Check if the file already has logger imports
  if ! grep -q "from '@/lib/logger'" "$file"; then
    # Add logger import after existing imports
    if grep -q "^import.*from" "$file"; then
      # Find the last import line and add logger import after it
      last_import_line=$(grep -n "^import.*from" "$file" | tail -1 | cut -d: -f1)
      sed -i "${last_import_line}a\\import { logError, logWarning, logInfo } from '@/lib/logger';" "$file"
    else
      # Add as first line if no imports exist
      sed -i '1i\\import { logError, logWarning, logInfo } from "@/lib/logger";' "$file"
    fi
  fi
  
  # Replace console.error statements
  sed -i "s/console\.error('\([^']*\)',\s*\([^)]*\));/logError('\1', \2, '$(basename "$file" .ts)');/g" "$file"
  sed -i 's/console\.error("\([^"]*\)",\s*\([^)]*\));/logError("\1", \2, "$(basename "$file" .ts)");/g' "$file"
  sed -i "s/console\.error('\([^']*\)');/logError('\1', undefined, '$(basename "$file" .ts)');/g" "$file"
  sed -i 's/console\.error("\([^"]*\)");/logError("\1", undefined, "$(basename "$file" .ts)");/g' "$file"
  
  # Replace console.warn statements
  sed -i "s/console\.warn('\([^']*\)',\s*\([^)]*\));/logWarning('\1', '$(basename "$file" .ts)', { data: \2 });/g" "$file"
  sed -i 's/console\.warn("\([^"]*\)",\s*\([^)]*\));/logWarning("\1", "$(basename "$file" .ts)", { data: \2 });/g' "$file"
  sed -i "s/console\.warn('\([^']*\)');/logWarning('\1', '$(basename "$file" .ts)');/g" "$file"
  sed -i 's/console\.warn("\([^"]*\)");/logWarning("\1", "$(basename "$file" .ts)");/g' "$file"
  
  # Replace console.log statements (remove or replace with debug logging in dev only)
  sed -i '/console\.log/d' "$file"
  
  # Replace console.info statements
  sed -i "s/console\.info('\([^']*\)');/logInfo('\1', '$(basename "$file" .ts)');/g" "$file"
  sed -i 's/console\.info("\([^"]*\)");/logInfo("\1", "$(basename "$file" .ts)");/g' "$file"
  
  echo "Processed: $file"
done

echo "Console.log replacement completed!"
echo "Files processed: $(echo "$files_with_console" | wc -l)"