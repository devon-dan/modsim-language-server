# IntelliJ IDEA Setup Guide

This guide provides step-by-step instructions for configuring the MODSIM III Language Server in IntelliJ IDEA and other JetBrains IDEs (PyCharm, WebStorm, etc.).

## Prerequisites

- IntelliJ IDEA 2020.3 or later (Community or Ultimate Edition)
- Node.js 14.0.0 or later installed
- The MODSIM III Language Server package (automatically fetched via npx)

## Installation Steps

### Step 1: Install LSP Support Plugin

1. Open IntelliJ IDEA
2. Go to **File → Settings** (Windows/Linux) or **IntelliJ IDEA → Preferences** (macOS)
3. Navigate to **Plugins**
4. Click the **Marketplace** tab
5. Search for "LSP Support"
6. Install the **LSP Support** plugin by gtache
7. Restart IntelliJ IDEA when prompted

### Step 2: Configure Language Server

1. Open **File → Settings → Languages & Frameworks → Language Server Protocol → Server Definitions**
2. Click the **+** button to add a new server definition
3. Configure as follows:

   **Extension**: `mod`

   **Command**: Select "Raw command"

   **Command line** (Windows):
   ```
   npx.cmd modsim-language-server --stdio
   ```

   **Command line** (macOS/Linux):
   ```
   npx modsim-language-server --stdio
   ```

   Alternatively, if you've installed globally:
   ```
   modsim-language-server --stdio
   ```

4. Click **OK** to save

### Step 3: Associate File Type

1. Go to **File → Settings → Editor → File Types**
2. Click the **+** button to add a new file type
3. Configure:
   - **Name**: MODSIM III
   - **Description**: MODSIM III simulation language
   - **Line comment**: `//` (not used in MODSIM, but required field)
   - **Block comment start**: `{` or `(*`
   - **Block comment end**: `}` or `*)`
4. In the **File name patterns** section, add:
   - `*.mod`
5. Click **OK** to save

### Step 4: Configure Syntax Highlighting (Optional)

For basic syntax highlighting before the LSP server starts:

1. Go to **File → Settings → Editor → File Types**
2. Select the **MODSIM III** file type you created
3. Add keywords under the **Keywords** tabs:

   **Keywords 1** (case-sensitive):
   ```
   DEFINITION IMPLEMENTATION MAIN PROGRAM MODULE
   PROCEDURE FUNCTION METHOD ASK TELL
   BEGIN END IF THEN ELSE ELSIF
   WHILE DO FOR TO DOWNTO BY LOOP EXIT
   CASE OF RETURN WAIT DURATION ON INTERRUPT
   OBJECT PROTO NEW
   TYPE VAR CONST
   INTEGER REAL BOOLEAN STRING ARRAY RECORD
   ```

   **Keywords 2**:
   ```
   IN OUT INOUT VAR
   FROM IMPORT EXPORT QUALIFIED
   DIV MOD AND OR NOT XOR
   TRUE FALSE NILOBJ NILREC NILARRAY
   ```

4. Click **OK** to save

### Step 5: Verify Installation

1. Open a `.mod` file in your project
2. Check the status bar at the bottom of IntelliJ IDEA - you should see "LSP: modsim-language-server"
3. Try the following features:

   **Auto-completion**: Start typing and press `Ctrl+Space`

   **Go to Definition**: `Ctrl+Click` on a symbol (or `Ctrl+B`)

   **Find Usages**: Right-click → Find Usages (or `Alt+F7`)

   **Hover Information**: Hover over a symbol to see type information

   **Parameter Hints**: Type a procedure call and see parameter hints

## Troubleshooting

### Language server not starting

**Symptoms**: No completions, no diagnostics, status bar shows "LSP: disconnected"

**Solutions**:
1. Check that Node.js is installed:
   ```bash
   node --version
   ```
2. **On Windows, use `npx.cmd` instead of `npx`** in the command line configuration
3. Test the language server manually:
   ```bash
   npx modsim-language-server --stdio
   ```
   Type something and press Enter - you should see JSON-RPC messages
4. Check IntelliJ's event log (**Help → Show Log in Explorer/Finder**)
5. Restart IntelliJ IDEA

### LSP plugin errors in event log

**Symptoms**: Errors mentioning "LSP" or "Language Server" in the event log

**Solutions**:
1. **On Windows, ensure you use `npx.cmd` not just `npx`**
2. Update the LSP Support plugin to the latest version
3. Try using absolute path to npx:
   - Windows: `C:\Program Files\nodejs\npx.cmd modsim-language-server --stdio`
   - macOS/Linux: `/usr/local/bin/npx modsim-language-server --stdio`
4. Use global installation instead:
   ```bash
   npm install -g modsim-language-server
   ```
   Then use: `modsim-language-server --stdio`

### Features not working for specific files

**Symptoms**: Some features work, but not for certain files

**Solutions**:
1. Ensure the file has `.mod` extension
2. Check that the file is part of an indexed project
3. Try closing and reopening the file
4. Invalidate caches: **File → Invalidate Caches / Restart**

### Performance issues

**Symptoms**: Slow typing, laggy completions, high CPU usage

**Solutions**:
1. Check workspace size - very large projects may be slow during initial indexing
2. Increase IntelliJ heap size:
   - **Help → Change Memory Settings**
   - Increase to at least 2GB
3. Exclude build/output directories from indexing:
   - **File → Settings → Project Structure → Modules**
   - Mark build directories as "Excluded"

### Completions not appearing

**Symptoms**: Auto-completion popup doesn't show or is empty

**Solutions**:
1. Ensure IntelliJ's code completion is enabled:
   - **File → Settings → Editor → General → Code Completion**
   - Check "Show suggestions as you type"
2. Try invoking manually with `Ctrl+Space`
3. Check LSP server is running (status bar)
4. Check the `.mod` file doesn't have syntax errors that prevent parsing

## Advanced Configuration

### Custom Server Arguments

To add custom arguments to the language server:

1. Go to **File → Settings → Languages & Frameworks → Language Server Protocol → Server Definitions**
2. Edit your MODSIM server definition
3. Modify command line, e.g.:

   Windows:
   ```
   npx.cmd modsim-language-server --stdio --log-level=debug
   ```

   macOS/Linux:
   ```
   npx modsim-language-server --stdio --log-level=debug
   ```

### Debugging the Language Server

To see detailed language server communication:

1. Enable LSP logging in the plugin settings
2. Check IntelliJ's log file:
   - **Help → Show Log in Explorer/Finder**
   - Look for lines containing "LSP" or "modsim"

### Using in Multiple JetBrains IDEs

The same configuration works in:
- PyCharm
- WebStorm
- CLion
- Rider
- PhpStorm

Follow the same steps in each IDE where you want MODSIM III support.

## Keyboard Shortcuts

Once configured, these IntelliJ shortcuts will work with MODSIM files:

| Action | Windows/Linux | macOS |
|--------|---------------|-------|
| Auto-complete | `Ctrl+Space` | `Cmd+Space` |
| Go to Definition | `Ctrl+B` or `Ctrl+Click` | `Cmd+B` or `Cmd+Click` |
| Find Usages | `Alt+F7` | `Opt+F7` |
| Rename Symbol | `Shift+F6` | `Shift+F6` |
| Show Documentation | `Ctrl+Q` | `Ctrl+J` |
| Parameter Info | `Ctrl+P` | `Cmd+P` |
| Navigate Back | `Ctrl+Alt+Left` | `Cmd+[` |
| Navigate Forward | `Ctrl+Alt+Right` | `Cmd+]` |
| File Structure | `Ctrl+F12` | `Cmd+F12` |
| Search Everywhere | `Double Shift` | `Double Shift` |

## Tips and Tricks

### 1. Quick Documentation

Hover over any symbol or press `Ctrl+Q` to see:
- Type information
- Parameter signatures
- Source location

### 2. File Structure Popup

Press `Ctrl+F12` to see an outline of the current module:
- Types
- Variables
- Procedures
- Objects

### 3. Navigate Between Definition/Implementation

For modules with separate DEFINITION and IMPLEMENTATION:
- Use `Ctrl+Alt+Home` to navigate between related files

### 4. TODO Comments

The language server recognizes TODO comments:
```modsim
{ TODO: Implement error handling }
(* FIXME: This breaks with negative values *)
```

View all TODOs: **View → Tool Windows → TODO**

### 5. Code Folding

The language server provides folding ranges for:
- MODULE blocks
- PROCEDURE/FUNCTION bodies
- OBJECT definitions
- BEGIN/END blocks
- Comment blocks

## Known Limitations

1. **Refactoring**: Some advanced IntelliJ refactorings may not work (Extract Method, Change Signature)
2. **Debugger Integration**: MODSIM debugging is not supported through LSP
3. **Build Integration**: Use external MODSIM compiler - IntelliJ won't build `.mod` files
4. **Version Control**: Git integration works normally for `.mod` files

## Getting Help

If you encounter issues:

1. Check the [main README troubleshooting section](../README.md#troubleshooting)
2. Review IntelliJ's event log: **Help → Show Log in Explorer/Finder**
3. Test the language server manually in terminal
4. Open an issue on [GitHub](https://github.com/devon-dan/modsim-language-server/issues) with:
   - IntelliJ version
   - LSP Support plugin version
   - Sample `.mod` file that reproduces the issue
   - Relevant log excerpts

## Additional Resources

- [IntelliJ LSP Support Plugin](https://plugins.jetbrains.com/plugin/10209-lsp-support)
- [Language Server Protocol Specification](https://microsoft.github.io/language-server-protocol/)
- [MODSIM III Language Guide](../modsim-docs/docs/manuals/llm-modsim-guide.md)

---

*Last updated: 2024-01 | For IntelliJ IDEA 2023.3+*
