import ReactMarkdown from 'react-markdown';

export default function ChatMessage({ message }) {
  const { role, content, sourceFiles } = message;

  return (
    <div className={`chat-message ${role}`}>
      <div className="message-label">{role === 'user' ? 'You' : 'AI'}</div>
      <div className="message-content">
        {role === 'assistant' ? (
          <ReactMarkdown>{content}</ReactMarkdown>
        ) : (
          <p>{content}</p>
        )}
        {sourceFiles && sourceFiles.length > 0 && (
          <div className="source-files">
            <span>Sources: </span>
            {sourceFiles.map((file, i) => (
              <code key={i}>{file}</code>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
