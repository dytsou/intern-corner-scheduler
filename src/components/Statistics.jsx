function Statistics({ schedule }) {
	const satisfied = schedule.satisfied_same_once_pairs.length;
	const unsatisfied = schedule.unsatisfied_same_once_pairs.length;
	const violations = schedule.never_together_violations.length;

	return (
		<div className="statistics-grid">
			<div className="stat-card success">
				<div className="stat-value">{satisfied}</div>
				<div className="stat-label">Satisfied Same-Once Pairs</div>
			</div>
			<div className="stat-card warning">
				<div className="stat-value">{unsatisfied}</div>
				<div className="stat-label">Unsatisfied Same-Once Pairs</div>
			</div>
			<div className={`stat-card ${violations > 0 ? 'danger' : 'success'}`}>
				<div className="stat-value">{violations}</div>
				<div className="stat-label">Never-Together Violations</div>
			</div>
			<div className="stat-card">
				<div className="stat-value">{schedule.objective_value}</div>
				<div className="stat-label">Objective Value</div>
			</div>
			<div className="stat-card">
				<div className="stat-value">{schedule.solver_status}</div>
				<div className="stat-label">Solver Status</div>
			</div>
		</div>
	);
}

export default Statistics;

