// Release notes for each version, newest first.
// Shown to users when their installed version is behind.
const releases = [
  {
    version: '1.2.0',
    date: '2026-05-10',
    notes: [
      'New: Startup update check — notifies when a newer version is available with release notes',
    ],
  },
  {
    version: '1.1.1',
    date: '2026-05-10',
    notes: [
      'Fix: Deck URLs now resolve to full https://deckdrop.live/... URLs instead of relative paths',
    ],
  },
  {
    version: '1.1.0',
    date: '2026-05-10',
    notes: [
      'New tool: list_themes — discover all 16 preset themes with CSS variables, fonts, and design guidelines',
    ],
  },
  {
    version: '1.0.0',
    date: '2026-05-08',
    notes: [
      'Initial release: deploy_deck, list_decks, get_deck, delete_deck, update_visibility',
    ],
  },
];

module.exports = releases;
