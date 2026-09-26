import ErrorMessage from './ErrorMessage';
import LoadingSpinner from './LoadingSpinner';

function GenerationLoadingScreen({
  statusMessage,
  cancelling,
  error,
  onCancel,
  onDismissError,
}) {
  return (
    <div className="generation-screen">
      <dialog
        open
        className="generation-loader"
        aria-modal="true"
        aria-labelledby="generation-title"
      >
        <h1 id="generation-title" className="visually-hidden">
          Generating schedule
        </h1>
        <div
          className="generation-spinner"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <LoadingSpinner />
          <span className="visually-hidden">
            {statusMessage || 'Finding a good mix for every round…'}
          </span>
        </div>
        <ErrorMessage message={error} onDismiss={onDismissError} />
        <button
          type="button"
          className="btn-secondary generation-cancel"
          onClick={onCancel}
          disabled={cancelling}
          autoFocus
        >
          {cancelling ? 'Stopping…' : 'Cancel generation'}
        </button>
      </dialog>
    </div>
  );
}

export default GenerationLoadingScreen;
