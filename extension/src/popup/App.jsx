import { useState } from 'react';
import RepoInput from './components/RepoInput';
import ChatWindow from './components/ChatWindow';
import ChatInput from './components/ChatInput';
import StatusBar from './components/StatusBar';
import { loadRepo, askQuestion } from '../utils/api';
import './styles/popup.css';

export default function App() {
  const [repoUrl, setRepoUrl] = useState('');
  const [repoInfo, setRepoInfo] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLoadRepo = async (url) => {
    setIsLoading(true);
    setError(null);
    setMessages([]);
    setRepoInfo(null);
    try {
      const data = await loadRepo(url);
      setRepoUrl(url);
      setRepoInfo(data);
      setMessages([{
        role: 'assistant',
        content: `Repository **${data.repo_name}** loaded successfully! ${data.files_indexed} chunks indexed.\n\n${data.description || ''}\n\nAsk me anything about this repository.`,
      }]);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (question) => {
    const userMessage = { role: 'user', content: question };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);
    try {
      const history = messages.map(({ role, content }) => ({ role, content }));
      const data = await askQuestion(question, repoUrl, history);
      const assistantMessage = {
        role: 'assistant',
        content: data.answer,
        sourceFiles: data.source_files,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    setRepoInfo(null);
    setRepoUrl('');
    setError(null);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>GitHub Repo Q&A</h1>
        {repoInfo && (
          <button className="clear-btn" onClick={handleClearChat}>
            Clear
          </button>
        )}
      </header>
      <RepoInput onLoad={handleLoadRepo} isLoading={isLoading} />
      <StatusBar isLoading={isLoading} error={error} repoInfo={repoInfo} />
      <ChatWindow messages={messages} />
      <ChatInput
        onSend={handleSendMessage}
        disabled={isLoading || !repoInfo}
      />
    </div>
  );
}
