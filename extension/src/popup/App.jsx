import { useState, useEffect, useCallback } from 'react';
import RepoInput from './components/RepoInput';
import ChatWindow from './components/ChatWindow';
import ChatInput from './components/ChatInput';
import StatusBar from './components/StatusBar';
import { loadRepo, askQuestion } from '../utils/api';
import { saveChatSession, loadChatSession, deleteChatSession } from '../utils/db';
import './styles/popup.css';

export default function App() {
  const [repoUrl, setRepoUrl] = useState('');
  const [repoInfo, setRepoInfo] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loadingStage, setLoadingStage] = useState(null);

  // Persist chat to IndexedDB whenever messages change
  const persistChat = useCallback(async (url, msgs, info) => {
    if (url && msgs.length > 0) {
      try {
        await saveChatSession(url, msgs, info);
      } catch (e) {
        console.warn('Failed to persist chat:', e);
      }
    }
  }, []);

  // Save to IndexedDB on message/repoInfo changes
  useEffect(() => {
    if (repoUrl && messages.length > 0) {
      persistChat(repoUrl, messages, repoInfo);
    }
  }, [messages, repoInfo, repoUrl, persistChat]);

  const handleLoadRepo = async (url) => {
    setIsLoading(true);
    setError(null);
    setMessages([]);
    setRepoInfo(null);
    setLoadingStage({ stage: 'fetching', message: 'Fetching repo...' });

    // Check if we have a saved session for this repo
    try {
      const saved = await loadChatSession(url);
      if (saved && saved.messages && saved.messages.length > 0) {
        // We still need to load the repo on backend (for vector store)
        // but can restore chat history from IndexedDB
        const data = await loadRepo(url, (stageInfo) => {
          setLoadingStage(stageInfo);
        });
        setRepoUrl(url);
        setRepoInfo(data);
        // Restore previous messages
        setMessages(saved.messages);
        setIsLoading(false);
        setLoadingStage(null);
        return;
      }
    } catch (e) {
      // No saved session or load failed, proceed normally
    }

    try {
      const data = await loadRepo(url, (stageInfo) => {
        setLoadingStage(stageInfo);
      });
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
      setLoadingStage(null);
    }
  };

  const handleSendMessage = async (question) => {
    const userMessage = { role: 'user', content: question };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);
    setLoadingStage({ stage: 'answering', message: 'Generating answer...' });
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
      setLoadingStage(null);
    }
  };

  const handleClearChat = async () => {
    if (repoUrl) {
      try {
        await deleteChatSession(repoUrl);
      } catch (e) {
        console.warn('Failed to delete chat session:', e);
      }
    }
    setMessages([]);
    setRepoInfo(null);
    setRepoUrl('');
    setError(null);
    setLoadingStage(null);
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-left">
          <div className="app-logo">
            <svg viewBox="0 0 16 16">
              <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z" />
            </svg>
          </div>
          <h1>Repo Q&A</h1>
        </div>
        {repoInfo && (
          <button className="clear-btn" onClick={handleClearChat}>
            New Chat
          </button>
        )}
      </header>
      <RepoInput onLoad={handleLoadRepo} isLoading={isLoading} />
      <StatusBar isLoading={isLoading} error={error} repoInfo={repoInfo} loadingStage={loadingStage} />
      <ChatWindow messages={messages} />
      <ChatInput
        onSend={handleSendMessage}
        disabled={isLoading || !repoInfo}
      />
    </div>
  );
}
