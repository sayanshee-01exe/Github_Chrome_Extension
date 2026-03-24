export async function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['backendUrl'], (result) => {
      resolve({
        backendUrl: result.backendUrl || 'http://localhost:8000',
      });
    });
  });
}

export async function saveSettings({ backendUrl }) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ backendUrl }, resolve);
  });
}
