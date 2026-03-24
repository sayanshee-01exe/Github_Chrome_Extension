export default function StatusBar({ isLoading, error, repoInfo }) {
  if (error) {
    return <div className="status-bar error">{error}</div>;
  }
  if (isLoading) {
    return (
      <div className="status-bar loading">
        <span className="spinner" />
        {repoInfo ? 'Thinking...' : 'Indexing repository...'}
      </div>
    );
  }
  return null;
}
