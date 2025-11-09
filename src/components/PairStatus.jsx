function PairStatus({ schedule }) {
	const renderPairSection = (title, pairs, className) => {
		if (pairs.length === 0) return null;

		return (
			<div className="pair-status-section">
				<h3>{title}</h3>
				<div className="pair-list">
					{pairs.map((pair, index) => (
						<span key={index} className={`pair-badge ${className}`}>
							{pair[0]} × {pair[1]}
						</span>
					))}
				</div>
			</div>
		);
	};

	return (
		<div className="pair-status-container">
			{renderPairSection(
				'Satisfied Same-Once Pairs',
				schedule.satisfied_same_once_pairs,
				'satisfied'
			)}
			{renderPairSection(
				'Unsatisfied Same-Once Pairs',
				schedule.unsatisfied_same_once_pairs,
				'unsatisfied'
			)}
			{renderPairSection(
				'Never-Together Violations',
				schedule.never_together_violations,
				'violation'
			)}
		</div>
	);
}

export default PairStatus;

