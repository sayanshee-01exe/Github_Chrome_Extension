const STAGE_CONFIG = {
  fetching: { icon: 'fetch', label: 'Fetching repo...' },
  indexing: { icon: 'index', label: 'Indexing code...' },
  answering: { icon: 'answer', label: 'Generating answer...' },
};

export default function StatusBar({ isLoading, error, repoInfo, loadingStage }) {
  if (error) {
    return <div className="status-bar error">{error}</div>;
  }
  if (isLoading) {
    const stage = loadingStage?.stage;
    const config = STAGE_CONFIG[stage];
    const message = loadingStage?.message || config?.label || 'Loading...';

    return (
      <div className="status-bar loading">
        <span className="spinner" />
        <span className="loading-message">{message}</span>
        {stage && (
          <div className="loading-stages">
            <span className={`stage-dot ${stage === 'fetching' ? 'active' : (stage === 'indexing' || stage === 'answering') ? 'done' : ''}`} />
            <span className={`stage-dot ${stage === 'indexing' ? 'active' : stage === 'answering' ? 'done' : ''}`} />
            <span className={`stage-dot ${stage === 'answering' ? 'active' : ''}`} />
          </div>
        )}
      </div>
    );
  }
  return null;
}
