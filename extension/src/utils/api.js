import { getSettings } from './storage';

async function getBaseUrl() {
  const settings = await getSettings();
  return settings.backendUrl;
}

export async function loadRepo(repoUrl) {
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
  return res.json();
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
