import { useState } from 'react';
import Statistics from './Statistics';
import RoundSelector from './RoundSelector';
import TableAssignments from './TableAssignments';
import PairStatus from './PairStatus';

function ResultsDisplay({ schedule, onReset }) {
	const [currentRound, setCurrentRound] = useState(0);

	return (
		<section className="card" id="results-section">
			<h2>Schedule Results</h2>

			<Statistics schedule={schedule} />

			<RoundSelector
				numRounds={schedule.rounds}
				currentRound={currentRound}
				onRoundChange={setCurrentRound}
			/>

			<TableAssignments
				schedule={schedule}
				currentRound={currentRound}
			/>

			<PairStatus schedule={schedule} />

			<button type="button" className="btn-secondary" onClick={onReset}>
				Create New Schedule
			</button>
		</section>
	);
}

export default ResultsDisplay;

