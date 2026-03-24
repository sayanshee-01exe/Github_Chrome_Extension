import { useState } from 'react';

export default function RepoInput({ onLoad, isLoading }) {
  const [url, setUrl] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;
    const match = trimmed.match(/github\.com\/([^/]+\/[^/]+)/);
    if (!match) {
      alert('Please enter a valid GitHub repository URL');
      return;
    }
    onLoad(trimmed);
  };

  return (
    <form className="repo-input" onSubmit={handleSubmit}>
      <input
        type="text"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://github.com/owner/repo"
        disabled={isLoading}
      />
      <button type="submit" disabled={isLoading || !url.trim()}>
        {isLoading ? 'Loading...' : 'Load'}
      </button>
    </form>
  );
}
