const path = require('path');
const { Server } = require('@modelcontextprotocol/sdk/server');

// Resolve internal SDK paths not exposed via package exports
const sdkBase = path.join(path.dirname(require.resolve('@modelcontextprotocol/sdk/server')), '..');
const { StdioServerTransport } = require(path.join(sdkBase, 'server', 'stdio.js'));
const { ListToolsRequestSchema, CallToolRequestSchema } = require(path.join(sdkBase, 'types.js'));

const { tools, handleTool } = require('./tools');

const server = new Server(
  { name: 'deckdrop', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

// Handle tools/list
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Handle tools/call
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    return await handleTool(name, args);
  } catch (err) {
    return {
      content: [{ type: 'text', text: `Error: ${err.message}` }],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('Failed to start DeckDrop MCP server:', err);
  process.exit(1);
});
