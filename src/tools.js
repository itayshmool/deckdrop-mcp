const fs = require('fs');
const path = require('path');
const os = require('os');
const api = require('./api');
const themes = require('./themes');

const SITE_URL = process.env.DECKDROP_API_URL || 'https://deckdrop.live';

function fullUrl(path) {
  if (!path) return path;
  if (path.startsWith('http')) return path;
  return `${SITE_URL}${path}`;
}

const tools = [
  {
    name: 'deploy_deck',
    description:
      'Deploy a presentation deck to DeckDrop Pro. Creates a new deck or updates an existing one. ' +
      'Provide HTML via the "file" parameter (preferred for large decks) or the "html" parameter. ' +
      'Returns the live URL where the deck is accessible. ' +
      'IMPORTANT: Decks default to PRIVATE. To deploy as public, you MUST first ask the user for explicit confirmation, ' +
      'then set both visibility="public" AND confirm_public=true. Never make a deck public without user approval.',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Display name for the deck (e.g. "Q3 Product Update")',
        },
        slug: {
          type: 'string',
          description:
            'URL-safe identifier for the deck. Lowercase letters, numbers, and hyphens only (e.g. "q3-product-update")',
        },
        file: {
          type: 'string',
          description:
            'Absolute path to an HTML file on disk. Preferred over "html" for large decks — ' +
            'write the deck to a file first, then pass the path here. Mutually exclusive with "html".',
        },
        html: {
          type: 'string',
          description:
            'Complete HTML content of the deck as a string. For large decks, prefer using "file" instead ' +
            'to avoid passing the entire content through the tool call.',
        },
        visibility: {
          type: 'string',
          enum: ['public', 'private'],
          description: 'Deck visibility. "public" = anyone with the link can view. "private" = only whitelisted viewers. Defaults to "private".',
        },
        confirm_public: {
          type: 'boolean',
          description:
            'Required safety flag. Must be set to true when visibility is "public". ' +
            'You MUST ask the user for explicit permission before setting this to true. ' +
            'The tool will reject public deployments without this flag.',
        },
      },
      required: ['name', 'slug'],
    },
  },
  {
    name: 'list_decks',
    description:
      'List all presentation decks owned by the authenticated user. ' +
      'Returns deck names, slugs, URLs, slide counts, sizes, and visibility.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_deck',
    description:
      'Get metadata for a specific deck by its slug. ' +
      'Returns name, slug, URL, slide count, size, visibility, and timestamps.',
    inputSchema: {
      type: 'object',
      properties: {
        slug: {
          type: 'string',
          description: 'The slug of the deck to look up',
        },
      },
      required: ['slug'],
    },
  },
  {
    name: 'delete_deck',
    description:
      'Permanently delete a deck. This cannot be undone. ' +
      'The deck URL will stop working immediately.',
    inputSchema: {
      type: 'object',
      properties: {
        slug: {
          type: 'string',
          description: 'The slug of the deck to delete',
        },
      },
      required: ['slug'],
    },
  },
  {
    name: 'update_visibility',
    description:
      'Change a deck\'s visibility without re-uploading the HTML content. ' +
      'Set to "public" to allow anyone with the link to view, or "private" to restrict to whitelisted viewers only. ' +
      'IMPORTANT: Changing to public requires explicit user confirmation. ' +
      'You MUST ask the user before making any deck public, then set confirm_public=true.',
    inputSchema: {
      type: 'object',
      properties: {
        slug: {
          type: 'string',
          description: 'The slug of the deck to update',
        },
        visibility: {
          type: 'string',
          enum: ['public', 'private'],
          description: 'New visibility setting',
        },
        confirm_public: {
          type: 'boolean',
          description:
            'Required when changing to "public". Must be true to confirm the user approved making this deck public.',
        },
      },
      required: ['slug', 'visibility'],
    },
  },
  {
    name: 'add_viewers',
    description:
      'Add viewers to a private deck\'s whitelist. Viewers can be individual email addresses ' +
      'or @domain entries (e.g. "@company.com" to allow everyone at that domain). ' +
      'Only applies to private decks — public decks are accessible to anyone.',
    inputSchema: {
      type: 'object',
      properties: {
        slug: {
          type: 'string',
          description: 'The slug of the deck to add viewers to',
        },
        viewers: {
          type: 'array',
          items: { type: 'string' },
          description:
            'List of email addresses or @domain entries to whitelist (e.g. ["alice@example.com", "@company.com"])',
        },
      },
      required: ['slug', 'viewers'],
    },
  },
  {
    name: 'list_themes',
    description:
      'List available DeckDrop preset themes with their CSS variables, fonts, and design guidelines. ' +
      'Use this to choose a theme before generating a deck with deploy_deck. ' +
      'Each theme includes complete CSS custom properties, Google Fonts URL, and styling notes.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description:
            'Optional theme ID to get details for a specific theme (e.g. "dark-tech", "data-terminal"). Omit to list all themes.',
        },
      },
    },
  },
  {
    name: 'install_skill',
    description:
      'Install or update the DeckDrop skill for Claude Code. ' +
      'The skill teaches your agent how to generate polished, DeckDrop-compliant presentations ' +
      'with 18 preset themes, accessibility, navigation, and presenter features. ' +
      'After installing, use /deckdrop to generate decks.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];

async function handleTool(name, args) {
  switch (name) {
    case 'deploy_deck': {
      // Resolve HTML content from file or inline
      let html = args.html;
      if (args.file) {
        if (html) {
          return {
            content: [{ type: 'text', text: 'Provide either "file" or "html", not both.' }],
            isError: true,
          };
        }
        html = fs.readFileSync(args.file, 'utf8');
      }
      if (!html) {
        return {
          content: [{ type: 'text', text: 'Either "file" or "html" is required.' }],
          isError: true,
        };
      }

      const visibility = args.visibility || 'private';

      if (visibility === 'public' && !args.confirm_public) {
        return {
          content: [{
            type: 'text',
            text: 'SECURITY: You are about to deploy this deck as PUBLIC (anyone with the link can view it). ' +
              'Please ask the user to confirm they want this deck to be publicly accessible, ' +
              'then call deploy_deck again with confirm_public=true.',
          }],
          isError: true,
        };
      }

      // Check if deck already exists
      const decks = await api.listDecks();
      const existing = decks.find(d => d.slug === args.slug);

      if (existing) {
        // Update existing deck
        const updated = await api.updateDeckHtml(existing.id, html);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  status: 'updated',
                  message: `Deck "${updated.name}" updated successfully`,
                  url: fullUrl(updated.url),
                  name: updated.name,
                  slug: updated.slug,
                  slide_count: updated.slide_count,
                  html_size: updated.html_size,
                  visibility: updated.visibility,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      // Create new deck
      const deck = await api.uploadDeck({
        name: args.name,
        slug: args.slug,
        html,
        visibility,
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                status: 'created',
                message: `Deck "${deck.name}" deployed successfully`,
                url: fullUrl(deck.url),
                name: deck.name,
                slug: deck.slug,
                slide_count: deck.slide_count,
                html_size: deck.html_size,
                visibility: deck.visibility,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case 'list_decks': {
      const decks = await api.listDecks();
      const summary = decks.map(d => ({
        name: d.name,
        slug: d.slug,
        url: fullUrl(d.url),
        visibility: d.visibility,
        slide_count: d.slide_count,
        html_size: d.html_size,
        updated_at: d.updated_at,
      }));

      return {
        content: [
          {
            type: 'text',
            text:
              decks.length === 0
                ? 'No decks found. Use deploy_deck to create your first deck.'
                : JSON.stringify(summary, null, 2),
          },
        ],
      };
    }

    case 'get_deck': {
      const decks = await api.listDecks();
      const deck = decks.find(d => d.slug === args.slug);
      if (!deck) {
        return {
          content: [{ type: 'text', text: `Deck with slug "${args.slug}" not found.` }],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                name: deck.name,
                slug: deck.slug,
                url: fullUrl(deck.url),
                visibility: deck.visibility,
                slide_count: deck.slide_count,
                html_size: deck.html_size,
                created_at: deck.created_at,
                updated_at: deck.updated_at,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case 'delete_deck': {
      const decks = await api.listDecks();
      const deck = decks.find(d => d.slug === args.slug);
      if (!deck) {
        return {
          content: [{ type: 'text', text: `Deck with slug "${args.slug}" not found.` }],
          isError: true,
        };
      }

      await api.deleteDeck(deck.id);
      return {
        content: [
          {
            type: 'text',
            text: `Deck "${deck.name}" (/${deck.slug}) deleted successfully.`,
          },
        ],
      };
    }

    case 'update_visibility': {
      if (args.visibility === 'public' && !args.confirm_public) {
        return {
          content: [{
            type: 'text',
            text: 'SECURITY: You are about to make this deck PUBLIC (anyone with the link can view it). ' +
              'Please ask the user to confirm they want this deck to be publicly accessible, ' +
              'then call update_visibility again with confirm_public=true.',
          }],
          isError: true,
        };
      }

      const decks = await api.listDecks();
      const deck = decks.find(d => d.slug === args.slug);
      if (!deck) {
        return {
          content: [{ type: 'text', text: `Deck with slug "${args.slug}" not found.` }],
          isError: true,
        };
      }

      const updated = await api.updateDeck(deck.id, { visibility: args.visibility });
      return {
        content: [
          {
            type: 'text',
            text: `Deck "${updated.name}" visibility changed to "${args.visibility}".`,
          },
        ],
      };
    }

    case 'add_viewers': {
      const decks = await api.listDecks();
      const deck = decks.find(d => d.slug === args.slug);
      if (!deck) {
        return {
          content: [{ type: 'text', text: `Deck with slug "${args.slug}" not found.` }],
          isError: true,
        };
      }

      const result = await api.addViewers(deck.id, args.viewers);
      return {
        content: [
          {
            type: 'text',
            text: `Added ${result.added} viewer(s) to "${deck.name}".`,
          },
        ],
      };
    }

    case 'list_themes': {
      if (args.id) {
        const theme = themes.find(t => t.id === args.id);
        if (!theme) {
          return {
            content: [
              {
                type: 'text',
                text: `Theme "${args.id}" not found. Use list_themes without an id to see all available themes.`,
              },
            ],
            isError: true,
          };
        }
        return {
          content: [{ type: 'text', text: JSON.stringify(theme, null, 2) }],
        };
      }

      const summary = themes.map(t => ({
        id: t.id,
        name: t.name,
        bestFor: t.bestFor,
      }));
      return {
        content: [{ type: 'text', text: JSON.stringify(summary, null, 2) }],
      };
    }

    case 'install_skill': {
      const skillUrl = `${SITE_URL}/api/skill/deckdrop`;
      const res = await fetch(skillUrl);
      if (!res.ok) {
        throw new Error(`Failed to fetch skill from ${skillUrl}: ${res.status}`);
      }
      const content = await res.text();

      const skillDir = path.join(os.homedir(), '.claude', 'skills', 'deckdrop');
      fs.mkdirSync(skillDir, { recursive: true });

      const skillPath = path.join(skillDir, 'SKILL.md');
      const existed = fs.existsSync(skillPath);
      fs.writeFileSync(skillPath, content, 'utf8');

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                status: existed ? 'updated' : 'installed',
                message: existed
                  ? 'DeckDrop skill updated successfully. Use /deckdrop to generate decks.'
                  : 'DeckDrop skill installed successfully. Use /deckdrop to generate decks.',
                path: skillPath,
                size: content.length,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    default:
      return {
        content: [{ type: 'text', text: `Unknown tool: ${name}` }],
        isError: true,
      };
  }
}

module.exports = { tools, handleTool };
