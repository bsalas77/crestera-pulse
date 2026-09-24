interface ErrorPanelProps {
  message: string;
  onRetry: () => void;
}

export function ErrorPanel({ message, onRetry }: ErrorPanelProps) {
  return (
    <div className="card error-panel" role="alert">
      <h3>This dashboard couldn't be loaded</h3>
      <p>{message}</p>
      <button onClick={onRetry}>Try again</button>
    </div>
  );
}
