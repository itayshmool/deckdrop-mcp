# deckdrop-mcp

MCP server for [DeckDrop Pro](https://deckdrop.live) — deploy presentation decks directly from AI coding tools.

## Quick Setup

### Claude Code

```bash
claude mcp add deckdrop -- npx -y deckdrop-mcp
```

Then set your token:

```bash
claude mcp update deckdrop -e DECKDROP_TOKEN=dd_your_token_here
```

Or add to `~/.claude/settings.json` manually:

```json
{
  "mcpServers": {
    "deckdrop": {
      "command": "npx",
      "args": ["-y", "deckdrop-mcp"],
      "env": {
        "DECKDROP_TOKEN": "dd_your_token_here"
      }
    }
  }
}
```

### Cursor

Open Settings → MCP → Add Server, then paste:

```json
{
  "mcpServers": {
    "deckdrop": {
      "command": "npx",
      "args": ["-y", "deckdrop-mcp"],
      "env": {
        "DECKDROP_TOKEN": "dd_your_token_here"
      }
    }
  }
}
```

## Get Your Token

1. Sign in at [deckdrop.live](https://deckdrop.live)
2. Go to [Connect](https://deckdrop.live/d/connect)
3. Copy your API token

## Tools

### `deploy_deck`

Deploy a presentation deck. Creates a new deck or updates an existing one.

**Parameters:**
- `name` (required) — Display name for the deck
- `slug` (required) — URL-safe identifier (lowercase, hyphens)
- `html` (required) — Complete HTML content (self-contained, embedded CSS/JS)
- `visibility` (optional) — `"public"` (default) or `"private"`

**Example prompt:**
> "Create a presentation about our Q3 results and deploy it to DeckDrop with slug q3-update"

### `list_decks`

List all your decks with their URLs, slide counts, and sizes.

### `get_deck`

Get metadata for a specific deck by slug.

**Parameters:**
- `slug` (required) — The deck's slug

### `delete_deck`

Permanently delete a deck.

**Parameters:**
- `slug` (required) — The deck's slug

### `update_visibility`

Change a deck's visibility.

**Parameters:**
- `slug` (required) — The deck's slug
- `visibility` (required) — `"public"` or `"private"`

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DECKDROP_TOKEN` | Yes | API token from [deckdrop.live/d/connect](https://deckdrop.live/d/connect) |
| `DECKDROP_API_URL` | No | Override API base URL (default: `https://deckdrop.live`) |

## License

MIT
