const BASE_URL = process.env.DECKDROP_API_URL || 'https://deckdrop.live';

function getToken() {
  const token = process.env.DECKDROP_TOKEN;
  if (!token) {
    throw new Error(
      'DECKDROP_TOKEN environment variable is required. ' +
      'Get your token at https://deckdrop.live/d/connect'
    );
  }
  return token;
}

async function request(method, path, body) {
  const url = `${BASE_URL}${path}`;
  const headers = {
    'Authorization': `Bearer ${getToken()}`,
  };

  const opts = { method, headers };

  if (body) {
    headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }

  const res = await fetch(url, opts);
  const data = await res.json();

  if (!res.ok) {
    const msg = data.error || `API error ${res.status}`;
    throw new Error(msg);
  }

  return data;
}

async function uploadDeck({ name, slug, visibility, html }) {
  const token = getToken();
  const boundary = '----DeckDropBoundary' + Date.now();
  const parts = [];

  parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="name"\r\n\r\n${name}`);
  parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="slug"\r\n\r\n${slug}`);
  parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="visibility"\r\n\r\n${visibility || 'public'}`);
  parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="html"; filename="index.html"\r\nContent-Type: text/html\r\n\r\n${html}`);
  parts.push(`--${boundary}--`);

  const body = parts.join('\r\n');

  const res = await fetch(`${BASE_URL}/api/decks`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    },
    body,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Upload failed: ${res.status}`);
  return data;
}

async function updateDeckHtml(deckId, html) {
  const token = getToken();
  const boundary = '----DeckDropBoundary' + Date.now();
  const parts = [];

  parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="html"; filename="index.html"\r\nContent-Type: text/html\r\n\r\n${html}`);
  parts.push(`--${boundary}--`);

  const body = parts.join('\r\n');

  const res = await fetch(`${BASE_URL}/api/decks/${deckId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    },
    body,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Update failed: ${res.status}`);
  return data;
}

async function listDecks() {
  return request('GET', '/api/decks');
}

async function deleteDeck(deckId) {
  return request('DELETE', `/api/decks/${deckId}`);
}

async function updateDeck(deckId, updates) {
  return request('PUT', `/api/decks/${deckId}`, updates);
}

module.exports = { listDecks, uploadDeck, updateDeckHtml, deleteDeck, updateDeck };
