function ErrorMessage({ message, onDismiss }) {
  if (!message) return null;

  return (
    <div className="error-message" role="alert" aria-atomic="true">
      <span>{message}</span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="error-dismiss"
          aria-label="Dismiss error"
        >
          ×
        </button>
      )}
    </div>
  );
}

export default ErrorMessage;
