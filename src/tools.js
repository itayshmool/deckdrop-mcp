const api = require('./api');

const tools = [
  {
    name: 'deploy_deck',
    description:
      'Deploy a presentation deck to DeckDrop Pro. Creates a new deck or updates an existing one. ' +
      'The HTML should be a complete, self-contained HTML file with all CSS and JS embedded. ' +
      'Returns the live URL where the deck is accessible.',
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
        html: {
          type: 'string',
          description: 'Complete HTML content of the deck — a single self-contained file with embedded CSS and JS',
        },
        visibility: {
          type: 'string',
          enum: ['public', 'private'],
          description: 'Deck visibility. "public" = anyone with the link can view. "private" = only whitelisted viewers. Defaults to "public".',
        },
      },
      required: ['name', 'slug', 'html'],
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
      'Set to "public" to allow anyone with the link to view, or "private" to restrict to whitelisted viewers only.',
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
      },
      required: ['slug', 'visibility'],
    },
  },
];

async function handleTool(name, args) {
  switch (name) {
    case 'deploy_deck': {
      // Check if deck already exists
      const decks = await api.listDecks();
      const existing = decks.find(d => d.slug === args.slug);

      if (existing) {
        // Update existing deck
        const updated = await api.updateDeckHtml(existing.id, args.html);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  status: 'updated',
                  message: `Deck "${updated.name}" updated successfully`,
                  url: updated.url,
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
        html: args.html,
        visibility: args.visibility || 'public',
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                status: 'created',
                message: `Deck "${deck.name}" deployed successfully`,
                url: deck.url,
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
        url: d.url,
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
                url: deck.url,
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

    default:
      return {
        content: [{ type: 'text', text: `Unknown tool: ${name}` }],
        isError: true,
      };
  }
}

module.exports = { tools, handleTool };
