const releases = require('./changelog');

const PKG = require('../package.json');
const CURRENT = PKG.version;

function compareVersions(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if (pa[i] > pb[i]) return 1;
    if (pa[i] < pb[i]) return -1;
  }
  return 0;
}

async function checkForUpdates() {
  try {
    const res = await fetch('https://registry.npmjs.org/deckdrop-mcp/latest', {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return;
    const data = await res.json();
    const latest = data.version;

    if (compareVersions(latest, CURRENT) <= 0) return;

    // Collect release notes for versions the user is missing
    const missed = releases.filter(r => compareVersions(r.version, CURRENT) > 0);

    const lines = [
      '',
      `  deckdrop-mcp update available: ${CURRENT} → ${latest}`,
      '',
    ];

    for (const r of missed) {
      lines.push(`  ${r.version} (${r.date})`);
      for (const note of r.notes) {
        lines.push(`    • ${note}`);
      }
    }

    lines.push('');
    lines.push('  Update: npx clear-npx-cache && claude mcp restart deckdrop');
    lines.push('');

    // stderr so it doesn't interfere with MCP protocol on stdout
    process.stderr.write(lines.join('\n') + '\n');
  } catch {
    // Silent — don't block startup if registry is unreachable
  }
}

module.exports = checkForUpdates;
