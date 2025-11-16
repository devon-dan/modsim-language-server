# VS Code Setup Guide

Step-by-step instructions for configuring the MODSIM III Language Server in Visual Studio Code.

## Quick Start

### Option 1: Manual Configuration (Recommended)

1. Install a generic LSP client extension
2. Configure settings
3. Start coding in MODSIM III

### Option 2: Custom Extension (Coming Soon)

A dedicated VS Code extension will be available on the marketplace in a future release.

## Detailed Setup

### Step 1: Install Prerequisites

Ensure you have:
- **Visual Studio Code** 1.60 or later
- **Node.js** 14.0.0 or later

Check Node.js installation:
```bash
node --version
```

### Step 2: Install LSP Client Extension

There are two options:

#### Option A: Generic LSP Client (Recommended)

1. Open VS Code
2. Press `Ctrl+P` (Windows/Linux) or `Cmd+P` (macOS)
3. Type: `ext install vscode.vscode-languageclient`
4. Install the **Language Server Protocol Client** extension

#### Option B: Using Built-in LSP Support

VS Code has built-in LSP support. You can configure it directly without an extension (requires creating a custom extension stub).

### Step 3: Configure Language Server

Create or edit your VS Code settings:

1. Press `Ctrl+,` (Windows/Linux) or `Cmd+,` (macOS) to open Settings
2. Click the **Open Settings (JSON)** icon in the top-right
3. Add the following configuration:

```json
{
  "files.associations": {
    "*.mod": "modsim"
  },
  "modsim.languageServer": {
    "command": "npx",
    "args": ["modsim-language-server", "--stdio"],
    "filetypes": ["modsim"]
  }
}
```

### Step 4: Create Language Configuration (Optional)

For better syntax highlighting and bracket matching:

1. Create `.vscode/extensions/modsim/` in your workspace
2. Create `package.json`:

```json
{
  "name": "modsim-language",
  "displayName": "MODSIM III Language",
  "description": "Language support for MODSIM III",
  "version": "0.1.0",
  "engines": {
    "vscode": "^1.60.0"
  },
  "categories": ["Programming Languages"],
  "contributes": {
    "languages": [{
      "id": "modsim",
      "aliases": ["MODSIM III", "modsim"],
      "extensions": [".mod"],
      "configuration": "./language-configuration.json"
    }]
  }
}
```

3. Create `language-configuration.json`:

```json
{
  "comments": {
    "blockComment": ["{", "}"]
  },
  "brackets": [
    ["BEGIN", "END"],
    ["(", ")"],
    ["[", "]"],
    ["{", "}"]
  ],
  "autoClosingPairs": [
    { "open": "(", "close": ")" },
    { "open": "[", "close": "]" },
    { "open": "{", "close": "}" },
    { "open": "\"", "close": "\"", "notIn": ["string"] },
    { "open": "'", "close": "'", "notIn": ["string"] }
  ],
  "surroundingPairs": [
    ["(", ")"],
    ["[", "]"],
    ["{", "}"],
    ["\"", "\""],
    ["'", "'"]
  ],
  "folding": {
    "markers": {
      "start": "^\\s*(BEGIN|PROCEDURE|FUNCTION|OBJECT|MODULE|RECORD|IF|WHILE|FOR|CASE|LOOP)",
      "end": "^\\s*(END)"
    }
  },
  "wordPattern": "[a-zA-Z_][a-zA-Z0-9_]*"
}
```

### Step 5: Configure Syntax Highlighting (Optional)

Create `syntaxes/modsim.tmLanguage.json` for TextMate grammar:

```json
{
  "name": "MODSIM III",
  "scopeName": "source.modsim",
  "patterns": [
    { "include": "#keywords" },
    { "include": "#strings" },
    { "include": "#comments" },
    { "include": "#numbers" }
  ],
  "repository": {
    "keywords": {
      "patterns": [{
        "name": "keyword.control.modsim",
        "match": "\\b(BEGIN|END|IF|THEN|ELSE|ELSIF|WHILE|DO|FOR|TO|DOWNTO|BY|LOOP|EXIT|CASE|OF|RETURN|WAIT|DURATION|ON|INTERRUPT)\\b"
      },
      {
        "name": "keyword.declaration.modsim",
        "match": "\\b(MODULE|PROCEDURE|FUNCTION|METHOD|OBJECT|PROTO|TYPE|VAR|CONST|DEFINITION|IMPLEMENTATION|MAIN|PROGRAM)\\b"
      },
      {
        "name": "keyword.other.modsim",
        "match": "\\b(ASK|TELL|NEW|FROM|IMPORT|EXPORT|QUALIFIED|IN|OUT|INOUT)\\b"
      },
      {
        "name": "storage.type.modsim",
        "match": "\\b(INTEGER|REAL|BOOLEAN|STRING|ARRAY|RECORD)\\b"
      },
      {
        "name": "constant.language.modsim",
        "match": "\\b(TRUE|FALSE|NILOBJ|NILREC|NILARRAY)\\b"
      }]
    },
    "strings": {
      "patterns": [{
        "name": "string.quoted.double.modsim",
        "begin": "\"",
        "end": "\"",
        "patterns": [{
          "name": "constant.character.escape.modsim",
          "match": "\"\""
        }]
      },
      {
        "name": "string.quoted.single.modsim",
        "begin": "'",
        "end": "'",
        "patterns": [{
          "name": "constant.character.escape.modsim",
          "match": "''''"
        }]
      }]
    },
    "comments": {
      "patterns": [{
        "name": "comment.block.modsim",
        "begin": "\\{",
        "end": "\\}"
      },
      {
        "name": "comment.block.modsim",
        "begin": "\\(\\*",
        "end": "\\*\\)"
      }]
    },
    "numbers": {
      "patterns": [{
        "name": "constant.numeric.modsim",
        "match": "\\b\\d+(\\.\\d+)?([eE][+-]?\\d+)?\\b"
      }]
    }
  }
}
```

Reference this in your `package.json`:

```json
{
  "contributes": {
    "grammars": [{
      "language": "modsim",
      "scopeName": "source.modsim",
      "path": "./syntaxes/modsim.tmLanguage.json"
    }]
  }
}
```

### Step 6: Verify Installation

1. Open a `.mod` file or create a new one
2. Check the status bar - language should show "MODSIM III"
3. Try typing and look for:
   - Auto-completion suggestions
   - Syntax highlighting
   - Error diagnostics
   - Hover tooltips

## Using the Language Server

### Auto-Completion

Type and press `Ctrl+Space` to see completions:

```modsim
PROCEDURE |  { Press Ctrl+Space here }
```

Suggestions include:
- MODSIM keywords
- Defined symbols (procedures, types, variables)
- Code snippets

### Go to Definition

- `F12` or `Ctrl+Click` on a symbol to jump to its definition
- Works across files in your workspace

### Find All References

- `Shift+F12` to find all usages of a symbol
- Results appear in the References panel

### Rename Symbol

- `F2` on a symbol to rename it throughout the workspace
- Previews all changes before applying

### Hover Information

- Hover over any symbol to see:
  - Type information
  - Parameter signatures
  - Documentation

### Diagnostics

Real-time error checking:
- Red squiggles for errors
- Yellow squiggles for warnings
- View all problems: `Ctrl+Shift+M`

### Code Actions

Click the lightbulb 💡 or press `Ctrl+.` to:
- Fix common errors
- Apply quick fixes
- Refactor code

## Keyboard Shortcuts

| Action | Windows/Linux | macOS |
|--------|---------------|-------|
| Auto-complete | `Ctrl+Space` | `Cmd+Space` |
| Go to Definition | `F12` | `F12` |
| Peek Definition | `Alt+F12` | `Opt+F12` |
| Find References | `Shift+F12` | `Shift+F12` |
| Rename Symbol | `F2` | `F2` |
| Quick Fix | `Ctrl+.` | `Cmd+.` |
| Show Hover | `Ctrl+K Ctrl+I` | `Cmd+K Cmd+I` |
| Format Document | `Shift+Alt+F` | `Shift+Opt+F` |
| Go Back | `Alt+Left` | `Ctrl+-` |
| Go Forward | `Alt+Right` | `Ctrl+Shift+-` |
| Command Palette | `Ctrl+Shift+P` | `Cmd+Shift+P` |

## Troubleshooting

### Language Server Not Starting

**Check status bar**: Look for "modsim-language-server" in the bottom-right

**Test manually**:
```bash
npx modsim-language-server --stdio
```
Should output JSON-RPC messages

**Check output logs**:
1. View → Output
2. Select "Language Server Protocol" from dropdown

**Solution**: Restart VS Code or reload window (`Ctrl+Shift+P` → "Reload Window")

### No Completions or Features

**Check file extension**: Must be `.mod`

**Check language mode**: Click language in status bar, select "MODSIM III"

**Check settings**: Verify `files.associations` in settings.json

**Solution**: Close and reopen the file

### Syntax Highlighting Not Working

**Check language configuration**: Ensure `syntaxes/modsim.tmLanguage.json` exists

**Check TextMate scope**: Press `Ctrl+Shift+P` → "Developer: Inspect Editor Tokens and Scopes"

**Solution**: Reload window or reinstall language extension

### Performance Issues

**Large workspace**: Initial indexing may take time

**Solution**:
- Exclude non-MODSIM directories in `.vscode/settings.json`:
  ```json
  {
    "files.exclude": {
      "**/node_modules": true,
      "**/build": true,
      "**/dist": true
    }
  }
  ```

## Advanced Configuration

### Custom Launch Configuration

Create `.vscode/launch.json` for debugging the language server:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "attach",
      "name": "Attach to Language Server",
      "port": 6009,
      "restart": true,
      "sourceMaps": true,
      "outFiles": ["${workspaceFolder}/dist/**/*.js"]
    }
  ]
}
```

### Workspace Settings

Create `.vscode/settings.json` in your project:

```json
{
  "files.associations": {
    "*.mod": "modsim"
  },
  "editor.semanticHighlighting.enabled": true,
  "editor.suggest.showKeywords": true,
  "editor.quickSuggestions": {
    "other": true,
    "comments": false,
    "strings": false
  }
}
```

## Known Limitations

- **Debugging**: MODSIM debugging not supported (use external debugger)
- **Build Tasks**: Use external MODSIM compiler
- **Snippets**: Limited snippet library (can be extended)

## Tips and Tricks

### 1. Breadcrumbs

Enable breadcrumbs for easy navigation:
- View → Show Breadcrumbs
- Shows module → procedure → current location

### 2. Outline View

View document structure:
- View → Open View → Outline
- Shows all procedures, types, objects in current file

### 3. Symbol Search

Search for symbols across workspace:
- `Ctrl+T` (Windows/Linux) or `Cmd+T` (macOS)
- Type symbol name

### 4. Multi-Cursor Editing

Edit multiple occurrences:
- `Ctrl+D` to select next occurrence
- `Ctrl+Shift+L` to select all occurrences

### 5. Zen Mode

Distraction-free coding:
- View → Appearance → Zen Mode
- Or `Ctrl+K Z`

## Getting Help

If you encounter issues:

1. Check [main README troubleshooting](../README.md#troubleshooting)
2. Review VS Code output logs
3. Test language server manually
4. Open issue on [GitHub](https://github.com/devon-dan/modsim-language-server/issues)

## Additional Resources

- [VS Code Language Extensions Guide](https://code.visualstudio.com/api/language-extensions/overview)
- [LSP Specification](https://microsoft.github.io/language-server-protocol/)
- [TextMate Grammar Guide](https://macromates.com/manual/en/language_grammars)

---

*Last updated: 2024-01 | For VS Code 1.85+*
