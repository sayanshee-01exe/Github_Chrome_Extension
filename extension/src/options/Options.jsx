import { useState, useEffect } from 'react';
import { getSettings, saveSettings } from '../utils/storage';
import './styles/options.css';

export default function Options() {
  const [backendUrl, setBackendUrl] = useState('http://localhost:8000');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getSettings().then((settings) => {
      if (settings.backendUrl) setBackendUrl(settings.backendUrl);
    });
  }, []);

  const handleSave = async () => {
    await saveSettings({ backendUrl });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="options-container">
      <h1>GitHub Repo Q&A - Settings</h1>
      <div className="form-group">
        <label htmlFor="backendUrl">Backend URL</label>
        <input
          id="backendUrl"
          type="text"
          value={backendUrl}
          onChange={(e) => setBackendUrl(e.target.value)}
          placeholder="http://localhost:8000"
        />
        <p className="hint">
          The URL where your FastAPI backend is running. API keys are configured
          in the backend's .env file.
        </p>
      </div>
      <button onClick={handleSave}>Save Settings</button>
      {saved && <p className="success">Settings saved!</p>}
    </div>
  );
}
