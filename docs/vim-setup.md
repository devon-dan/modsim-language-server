# Vim/Neovim Setup Guide

Complete guide for configuring the MODSIM III Language Server in Vim and Neovim using various LSP clients.

## Overview

There are several ways to use the MODSIM III Language Server with Vim/Neovim:

1. **Neovim native LSP** (Recommended for Neovim 0.5+)
2. **coc.nvim** (Works with both Vim 8+ and Neovim)
3. **vim-lsp** (Pure Vimscript, works with Vim 8+)

## Prerequisites

- **Neovim** 0.5+ or **Vim** 8.0+
- **Node.js** 14.0.0+ (for the language server)
- **npm** (bundled with Node.js)

Verify installation:
```bash
nvim --version  # or vim --version
node --version
```

## Setup Options

### Option 1: Neovim Native LSP (Recommended)

Best for Neovim 0.5+ users.

#### Install nvim-lspconfig

Using [packer.nvim](https://github.com/wbthomason/packer.nvim):

```lua
use 'neovim/nvim-lspconfig'
```

Or using [vim-plug](https://github.com/junegunn/vim-plug):

```vim
Plug 'neovim/nvim-lspconfig'
```

#### Configure MODSIM Language Server

Add to your `init.lua`:

```lua
local lspconfig = require('lspconfig')
local configs = require('lspconfig.configs')

-- Define MODSIM language server
if not configs.modsim then
  configs.modsim = {
    default_config = {
      cmd = {'npx', 'modsim-language-server', '--stdio'},
      filetypes = {'modsim'},
      root_dir = function(fname)
        return lspconfig.util.find_git_ancestor(fname) or vim.fn.getcwd()
      end,
      settings = {},
    },
  }
end

-- Set up MODSIM language server
lspconfig.modsim.setup{
  on_attach = function(client, bufnr)
    -- Enable completion triggered by <c-x><c-o>
    vim.api.nvim_buf_set_option(bufnr, 'omnifunc', 'v:lua.vim.lsp.omnifunc')

    -- Mappings
    local opts = { noremap=true, silent=true, buffer=bufnr }
    vim.keymap.set('n', 'gD', vim.lsp.buf.declaration, opts)
    vim.keymap.set('n', 'gd', vim.lsp.buf.definition, opts)
    vim.keymap.set('n', 'K', vim.lsp.buf.hover, opts)
    vim.keymap.set('n', 'gi', vim.lsp.buf.implementation, opts)
    vim.keymap.set('n', '<C-k>', vim.lsp.buf.signature_help, opts)
    vim.keymap.set('n', '<space>rn', vim.lsp.buf.rename, opts)
    vim.keymap.set('n', '<space>ca', vim.lsp.buf.code_action, opts)
    vim.keymap.set('n', 'gr', vim.lsp.buf.references, opts)
    vim.keymap.set('n', '<space>f', function() vim.lsp.buf.format { async = true } end, opts)
  end,
  flags = {
    debounce_text_changes = 150,
  }
}

-- Associate .mod files with modsim filetype
vim.filetype.add({
  extension = {
    mod = 'modsim',
  },
})
```

Or add to your `init.vim`:

```vim
lua << EOF
local lspconfig = require('lspconfig')
local configs = require('lspconfig.configs')

if not configs.modsim then
  configs.modsim = {
    default_config = {
      cmd = {'npx', 'modsim-language-server', '--stdio'},
      filetypes = {'modsim'},
      root_dir = lspconfig.util.root_pattern('.git'),
    },
  }
end

lspconfig.modsim.setup{}
EOF

" Associate .mod files
autocmd BufRead,BufNewFile *.mod set filetype=modsim
```

#### Optional: Add Auto-Completion

Install [nvim-cmp](https://github.com/hrsh7th/nvim-cmp) for better completions:

```lua
use 'hrsh7th/nvim-cmp'
use 'hrsh7th/cmp-nvim-lsp'
use 'hrsh7th/cmp-buffer'
use 'hrsh7th/cmp-path'

-- Configure nvim-cmp
local cmp = require('cmp')
cmp.setup({
  sources = {
    { name = 'nvim_lsp' },
    { name = 'buffer' },
    { name = 'path' },
  },
  mapping = cmp.mapping.preset.insert({
    ['<C-Space>'] = cmp.mapping.complete(),
    ['<CR>'] = cmp.mapping.confirm({ select = true }),
  }),
})
```

### Option 2: coc.nvim

Works with both Vim 8+ and Neovim.

#### Install coc.nvim

Using vim-plug:

```vim
Plug 'neoclide/coc.nvim', {'branch': 'release'}
```

Install and restart Vim/Neovim.

#### Configure MODSIM Language Server

1. Open Vim/Neovim
2. Run `:CocConfig` to edit coc-settings.json
3. Add MODSIM language server configuration:

```json
{
  "languageserver": {
    "modsim": {
      "command": "npx",
      "args": ["modsim-language-server", "--stdio"],
      "filetypes": ["modsim"],
      "rootPatterns": [".git/"]
    }
  }
}
```

4. Associate `.mod` files with `modsim` filetype in your `vimrc` or `init.vim`:

```vim
autocmd BufRead,BufNewFile *.mod set filetype=modsim
```

#### Recommended coc.nvim Mappings

Add to your `vimrc` or `init.vim`:

```vim
" GoTo code navigation
nmap <silent> gd <Plug>(coc-definition)
nmap <silent> gy <Plug>(coc-type-definition)
nmap <silent> gi <Plug>(coc-implementation)
nmap <silent> gr <Plug>(coc-references)

" Hover documentation
nnoremap <silent> K :call ShowDocumentation()<CR>

function! ShowDocumentation()
  if CocAction('hasProvider', 'hover')
    call CocActionAsync('doHover')
  else
    call feedkeys('K', 'in')
  endif
endfunction

" Symbol renaming
nmap <leader>rn <Plug>(coc-rename)

" Formatting
xmap <leader>f  <Plug>(coc-format-selected)
nmap <leader>f  <Plug>(coc-format-selected)

" Code actions
xmap <leader>a  <Plug>(coc-codeaction-selected)
nmap <leader>a  <Plug>(coc-codeaction-selected)
```

### Option 3: vim-lsp

Pure Vimscript solution for Vim 8+.

#### Install vim-lsp

Using vim-plug:

```vim
Plug 'prabirshrestha/vim-lsp'
Plug 'mattn/vim-lsp-settings'
Plug 'prabirshrestha/asyncomplete.vim'
Plug 'prabirshrestha/asyncomplete-lsp.vim'
```

#### Configure MODSIM Language Server

Add to your `vimrc`:

```vim
" Register MODSIM language server
if executable('npx')
  au User lsp_setup call lsp#register_server({
    \ 'name': 'modsim-language-server',
    \ 'cmd': {server_info->['npx', 'modsim-language-server', '--stdio']},
    \ 'allowlist': ['modsim'],
    \ })
endif

" Associate .mod files
autocmd BufRead,BufNewFile *.mod set filetype=modsim

" LSP mappings
function! s:on_lsp_buffer_enabled() abort
  setlocal omnifunc=lsp#complete
  if exists('+tagfunc') | setlocal tagfunc=lsp#tagfunc | endif
  nmap <buffer> gd <plug>(lsp-definition)
  nmap <buffer> gs <plug>(lsp-document-symbol-search)
  nmap <buffer> gS <plug>(lsp-workspace-symbol-search)
  nmap <buffer> gr <plug>(lsp-references)
  nmap <buffer> gi <plug>(lsp-implementation)
  nmap <buffer> <leader>rn <plug>(lsp-rename)
  nmap <buffer> [g <plug>(lsp-previous-diagnostic)
  nmap <buffer> ]g <plug>(lsp-next-diagnostic)
  nmap <buffer> K <plug>(lsp-hover)
endfunction

augroup lsp_install
  au!
  autocmd User lsp_buffer_enabled call s:on_lsp_buffer_enabled()
augroup END
```

## Syntax Highlighting

Create syntax file for MODSIM III:

**For Vim**: `~/.vim/syntax/modsim.vim`
**For Neovim**: `~/.config/nvim/syntax/modsim.vim`

```vim
" Vim syntax file for MODSIM III
" Language: MODSIM III
" Maintainer: MODSIM Community

if exists("b:current_syntax")
  finish
endif

" Keywords
syn keyword modsimKeyword BEGIN END IF THEN ELSE ELSIF
syn keyword modsimKeyword WHILE DO FOR TO DOWNTO BY LOOP EXIT
syn keyword modsimKeyword CASE OF RETURN WAIT DURATION ON INTERRUPT
syn keyword modsimKeyword ASK TELL NEW
syn keyword modsimKeyword PROCEDURE FUNCTION METHOD
syn keyword modsimKeyword MODULE DEFINITION IMPLEMENTATION MAIN PROGRAM
syn keyword modsimKeyword OBJECT PROTO TYPE VAR CONST
syn keyword modsimKeyword FROM IMPORT EXPORT QUALIFIED
syn keyword modsimKeyword IN OUT INOUT
syn keyword modsimKeyword FOREACH REPEAT UNTIL

" Operators
syn keyword modsimOperator DIV MOD AND OR NOT XOR

" Types
syn keyword modsimType INTEGER REAL BOOLEAN STRING ARRAY RECORD

" Constants
syn keyword modsimConstant TRUE FALSE NILOBJ NILREC NILARRAY

" Comments
syn region modsimComment start="{" end="}" contains=modsimComment
syn region modsimComment start="(\*" end="\*)" contains=modsimComment

" Strings
syn region modsimString start=+"+ skip=+""+ end=+"+
syn region modsimChar start=+'+ skip=+''''+ end=+'+

" Numbers
syn match modsimNumber "\<\d\+\(\.\d\+\)\?\([eE][+-]\?\d\+\)\?\>"

" Highlighting
hi def link modsimKeyword Keyword
hi def link modsimOperator Operator
hi def link modsimType Type
hi def link modsimConstant Constant
hi def link modsimComment Comment
hi def link modsimString String
hi def link modsimChar Character
hi def link modsimNumber Number

let b:current_syntax = "modsim"
```

Also create filetype detection:

**For Vim**: `~/.vim/ftdetect/modsim.vim`
**For Neovim**: `~/.config/nvim/ftdetect/modsim.vim`

```vim
autocmd BufRead,BufNewFile *.mod set filetype=modsim
```

## Key Mappings Reference

### Neovim Native LSP

| Action | Mapping |
|--------|---------|
| Go to definition | `gd` |
| Go to declaration | `gD` |
| Hover documentation | `K` |
| Signature help | `<C-k>` |
| Find references | `gr` |
| Rename symbol | `<space>rn` |
| Code action | `<space>ca` |
| Format document | `<space>f` |

### coc.nvim

| Action | Mapping |
|--------|---------|
| Go to definition | `gd` |
| Find references | `gr` |
| Hover documentation | `K` |
| Rename symbol | `<leader>rn` |
| Code action | `<leader>a` |
| Format selection | `<leader>f` |

### vim-lsp

| Action | Mapping |
|--------|---------|
| Go to definition | `gd` |
| Find references | `gr` |
| Hover documentation | `K` |
| Rename symbol | `<leader>rn` |
| Next diagnostic | `]g` |
| Previous diagnostic | `[g` |

## Troubleshooting

### Language Server Not Starting

**Check if npx is in PATH**:
```bash
which npx
```

**Test language server manually**:
```bash
npx modsim-language-server --stdio
```

**Check LSP status**:
- Neovim: `:LspInfo`
- coc.nvim: `:CocInfo`
- vim-lsp: `:LspStatus`

**Solution**: Restart Vim/Neovim

### No Completions

**Neovim native**: Ensure nvim-cmp is installed and configured

**coc.nvim**: Check `:CocList extensions` shows coc-json

**vim-lsp**: Ensure asyncomplete is installed

**Solution**: Press `<C-x><C-o>` for manual completion

### Syntax Highlighting Not Working

**Check filetype**:
```vim
:set filetype?
```

Should show `filetype=modsim`

**Solution**: Reload file or run `:set filetype=modsim`

### Performance Issues

**Disable semantic highlighting** if slow:

Neovim:
```lua
vim.g.lsp_semantic_enabled = 0
```

coc.nvim:
```json
{
  "semanticTokens.enable": false
}
```

**Increase debounce time**:

Neovim:
```lua
flags = {
  debounce_text_changes = 300,
}
```

## Advanced Configuration

### Custom LSP Handlers (Neovim)

```lua
-- Custom diagnostic display
vim.lsp.handlers["textDocument/publishDiagnostics"] = vim.lsp.with(
  vim.lsp.diagnostic.on_publish_diagnostics, {
    virtual_text = true,
    signs = true,
    underline = true,
    update_in_insert = false,
  }
)

-- Custom hover window
vim.lsp.handlers["textDocument/hover"] = vim.lsp.with(
  vim.lsp.handlers.hover, {
    border = "rounded"
  }
)
```

### Diagnostic Signs (Neovim)

```lua
local signs = { Error = "✗", Warn = "⚠", Hint = "⚑", Info = "ℹ" }
for type, icon in pairs(signs) do
  local hl = "DiagnosticSign" .. type
  vim.fn.sign_define(hl, { text = icon, texthl = hl, numhl = hl })
end
```

### coc.nvim Extensions

Useful coc extensions for MODSIM development:

```vim
:CocInstall coc-snippets
:CocInstall coc-pairs
:CocInstall coc-highlight
```

## Tips and Tricks

### 1. Quick Fix Window

Show all diagnostics in quickfix window:

Neovim:
```lua
vim.keymap.set('n', '<space>q', vim.diagnostic.setloclist)
```

coc.nvim:
```vim
nnoremap <silent> <space>q :CocDiagnostics<CR>
```

### 2. Symbol Outline

Show document symbols:

Neovim (requires symbols-outline.nvim):
```vim
:SymbolsOutline
```

coc.nvim:
```vim
:CocList outline
```

### 3. Workspace Symbols

Search for symbols across workspace:

Neovim:
```lua
vim.lsp.buf.workspace_symbol()
```

coc.nvim:
```vim
:CocList symbols
```

### 4. Code Navigation

Use tags-like navigation:

```vim
" Jump to tag
<C-]>

" Jump back
<C-t>
```

### 5. Split Window Navigation

Open definition in split:

```vim
:vsplit | lua vim.lsp.buf.definition()
```

## Known Limitations

- **Debugger**: No MODSIM debugging support
- **Build Integration**: Use external MODSIM compiler
- **Snippets**: Limited MODSIM-specific snippets

## Getting Help

If issues persist:

1. Check [main README troubleshooting](../README.md#troubleshooting)
2. Review Vim/Neovim logs
3. Test language server manually
4. Open issue on [GitHub](https://github.com/devon-dan/modsim-language-server/issues)

## Additional Resources

- [Neovim LSP Documentation](https://neovim.io/doc/user/lsp.html)
- [coc.nvim Wiki](https://github.com/neoclide/coc.nvim/wiki)
- [vim-lsp Documentation](https://github.com/prabirshrestha/vim-lsp)
- [nvim-lspconfig Server Configs](https://github.com/neovim/nvim-lspconfig/blob/master/doc/server_configurations.md)

---

*Last updated: 2024-01 | For Neovim 0.9+ and Vim 9.0+*
