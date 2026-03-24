import { getSettings } from './storage';

async function getBaseUrl() {
  const settings = await getSettings();
  return settings.backendUrl;
}

/**
 * Load a repo via SSE, calling onStage for each progress update.
 * onStage receives { stage: string, message: string }.
 * Returns the final repo data on success.
 */
export async function loadRepo(repoUrl, onStage) {
  const baseUrl = await getBaseUrl();
  const res = await fetch(`${baseUrl}/load-repo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repo_url: repoUrl }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to load repo (${res.status})`);
  }

  const contentType = res.headers.get('content-type') || '';

  // If the response is JSON (cached result), return directly
  if (contentType.includes('application/json')) {
    return res.json();
  }

  // Otherwise parse SSE stream
  return new Promise((resolve, reject) => {
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    function processLine(line) {
      if (line.startsWith('event:')) {
        buffer = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        const data = line.slice(5).trim();
        try {
          const parsed = JSON.parse(data);
          if (buffer === 'stage' && onStage) {
            onStage(parsed);
          } else if (buffer === 'done') {
            resolve(parsed);
          } else if (buffer === 'error') {
            reject(new Error(parsed.detail || 'Unknown error'));
          }
        } catch (e) {
          // ignore parse errors
        }
      }
    }

    function pump() {
      reader.read().then(({ done, value }) => {
        if (done) return;
        const text = decoder.decode(value, { stream: true });
        const lines = text.split('\n');
        for (const line of lines) {
          if (line.trim()) processLine(line.trim());
        }
        pump();
      }).catch(reject);
    }

    pump();
  });
}

export async function askQuestion(question, repoUrl, chatHistory) {
  const baseUrl = await getBaseUrl();
  const res = await fetch(`${baseUrl}/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question,
      repo_url: repoUrl,
      chat_history: chatHistory,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to get answer (${res.status})`);
  }
  return res.json();
}

export async function healthCheck() {
  const baseUrl = await getBaseUrl();
  const res = await fetch(`${baseUrl}/health`);
  return res.ok;
}
