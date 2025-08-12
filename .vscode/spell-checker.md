# VS Code Spell Checker Settings

Add this to your VS Code workspace settings (`.vscode/settings.json`) for the best spell checking experience:

```json
{
  "cSpell.enabled": true,
  "cSpell.showCommandsInEditorContextMenu": true,
  "cSpell.showStatus": true,
  "cSpell.diagnosticLevel": "Warning",
  "cSpell.checkLimit": 500,
  "cSpell.numSuggestions": 8,
  "cSpell.suggestionMenuType": "quickPick",
  "cSpell.allowCompoundWords": true,
  "cSpell.enableFiletypes": [
    "javascript",
    "typescript",
    "javascriptreact",
    "typescriptreact",
    "markdown",
    "json",
    "css",
    "html"
  ],
  "cSpell.ignorePaths": [
    "node_modules/**",
    "dist/**",
    "dist-electron/**",
    "**/*.min.js",
    "**/*.min.css",
    "package-lock.json"
  ]
}
```
