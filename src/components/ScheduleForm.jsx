import { useState } from 'react';
import PairInput from './PairInput';

function ScheduleForm({ onSubmit, loading }) {
	const [participants, setParticipants] = useState('');
	const [tables, setTables] = useState('');
	const [rounds, setRounds] = useState('');
	const [timeLimit, setTimeLimit] = useState(60);
	const [sameOncePairs, setSameOncePairs] = useState([]);
	const [neverTogetherPairs, setNeverTogetherPairs] = useState([]);

	const handleSubmit = (e) => {
		e.preventDefault();

		const participantsNum = parseInt(participants);
		const tablesNum = parseInt(tables);
		const roundsNum = parseInt(rounds);

		// Validation
		if (tablesNum > participantsNum) {
			alert('Number of tables cannot exceed number of participants');
			return;
		}

		const formData = {
			participants: participantsNum,
			tables: tablesNum,
			rounds: roundsNum,
			same_once_pairs: sameOncePairs
				.filter(pair => typeof pair.u === 'number' && typeof pair.v === 'number' && pair.u > 0 && pair.v > 0)
				.map(pair => ({ u: pair.u, v: pair.v })),
			never_together_pairs: neverTogetherPairs
				.filter(pair => typeof pair.u === 'number' && typeof pair.v === 'number' && pair.u > 0 && pair.v > 0)
				.map(pair => ({ u: pair.u, v: pair.v })),
			time_limit_seconds: timeLimit,
		};

		onSubmit(formData);
	};

	const addSameOncePair = () => {
		setSameOncePairs([...sameOncePairs, { u: '', v: '' }]);
	};

	const addNeverTogetherPair = () => {
		setNeverTogetherPairs([...neverTogetherPairs, { u: '', v: '' }]);
	};

	const updateSameOncePair = (index, field, value) => {
		const updated = [...sameOncePairs];
		updated[index] = { ...updated[index], [field]: value };
		setSameOncePairs(updated);
	};

	const updateNeverTogetherPair = (index, field, value) => {
		const updated = [...neverTogetherPairs];
		updated[index] = { ...updated[index], [field]: value };
		setNeverTogetherPairs(updated);
	};

	const removeSameOncePair = (index) => {
		setSameOncePairs(sameOncePairs.filter((_, i) => i !== index));
	};

	const removeNeverTogetherPair = (index) => {
		setNeverTogetherPairs(neverTogetherPairs.filter((_, i) => i !== index));
	};

	return (
		<section className="card" id="input-section">
			<h2>Schedule Parameters</h2>
			<form id="schedule-form" onSubmit={handleSubmit} className={loading ? 'loading' : ''}>
				<div className="form-group">
					<label htmlFor="participants">Number of Participants</label>
					<input
						type="number"
						id="participants"
						name="participants"
						min="1"
						required
						value={participants}
						onChange={(e) => setParticipants(e.target.value)}
					/>
					<small>Total number of participants (1..a)</small>
				</div>

				<div className="form-group">
					<label htmlFor="tables">Number of Tables</label>
					<input
						type="number"
						id="tables"
						name="tables"
						min="1"
						required
						value={tables}
						onChange={(e) => setTables(e.target.value)}
					/>
					<small>Number of tables (1..b). Participants 1..b will be hosts.</small>
				</div>

				<div className="form-group">
					<label htmlFor="rounds">Number of Rounds</label>
					<input
						type="number"
						id="rounds"
						name="rounds"
						min="1"
						required
						value={rounds}
						onChange={(e) => setRounds(e.target.value)}
					/>
					<small>Number of rounds to schedule</small>
				</div>

				<div className="form-group">
					<label htmlFor="time-limit">Time Limit (seconds)</label>
					<input
						type="number"
						id="time-limit"
						name="time-limit"
						min="1"
						max="300"
						value={timeLimit}
						onChange={(e) => setTimeLimit(parseInt(e.target.value))}
					/>
					<small>Maximum time for the solver (1-300 seconds)</small>
				</div>

				<div className="form-group">
					<div className="pairs-header">
						<label>Same-Once Pairs</label>
						<button type="button" className="btn-secondary" onClick={addSameOncePair}>
							+ Add Pair
						</button>
					</div>
					<small>Pairs that should be seated together exactly once</small>
					<div className="pairs-container">
						{sameOncePairs.map((pair, index) => (
							<PairInput
								key={index}
								pair={pair}
								onChange={(field, value) => updateSameOncePair(index, field, value)}
								onRemove={() => removeSameOncePair(index)}
							/>
						))}
					</div>
				</div>

				<div className="form-group">
					<div className="pairs-header">
						<label>Never-Together Pairs</label>
						<button type="button" className="btn-secondary" onClick={addNeverTogetherPair}>
							+ Add Pair
						</button>
					</div>
					<small>Pairs that must never be seated together</small>
					<div className="pairs-container">
						{neverTogetherPairs.map((pair, index) => (
							<PairInput
								key={index}
								pair={pair}
								onChange={(field, value) => updateNeverTogetherPair(index, field, value)}
								onRemove={() => removeNeverTogetherPair(index)}
							/>
						))}
					</div>
				</div>

				<button type="submit" className="btn-primary" disabled={loading}>
					{loading ? 'Generating...' : 'Generate Schedule'}
				</button>
			</form>
		</section>
	);
}

export default ScheduleForm;

