function ErrorMessage({ message, onDismiss }) {
	if (!message) return null;

	return (
		<div className="error-message" style={{ display: 'block' }}>
			{message}
			{onDismiss && (
				<button onClick={onDismiss} className="error-dismiss" aria-label="Dismiss error">
					×
				</button>
			)}
		</div>
	);
}

export default ErrorMessage;

