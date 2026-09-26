import { useState } from 'react';
import PairInput from './PairInput';

function ScheduleForm({ onSubmit, onCancel, loading, cancelling }) {
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
        .filter(
          (pair) =>
            typeof pair.u === 'number' &&
            typeof pair.v === 'number' &&
            pair.u > 0 &&
            pair.v > 0
        )
        .map((pair) => ({ u: pair.u, v: pair.v })),
      never_together_pairs: neverTogetherPairs
        .filter(
          (pair) =>
            typeof pair.u === 'number' &&
            typeof pair.v === 'number' &&
            pair.u > 0 &&
            pair.v > 0
        )
        .map((pair) => ({ u: pair.u, v: pair.v })),
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
    <section className="card form-card" id="input-section">
      <div className="section-heading">
        <h2>Schedule Parameters</h2>
      </div>
      <p className="section-intro">
        Choose your group size, tables, and rounds. Add anyone you want to bring
        together or keep apart.
      </p>
      <form
        id="schedule-form"
        onSubmit={handleSubmit}
        className={loading ? 'loading' : ''}
        aria-busy={loading}
      >
        <div className="parameter-grid">
          <div className="form-group">
            <label htmlFor="participants">Number of Participants</label>
            <input
              type="number"
              id="participants"
              name="participants"
              min="1"
              required
              aria-describedby="participants-help"
              value={participants}
              onChange={(e) => setParticipants(e.target.value)}
            />
            <small id="participants-help">
              Total number of participants (1..a)
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="tables">Number of Tables</label>
            <input
              type="number"
              id="tables"
              name="tables"
              min="1"
              required
              aria-describedby="tables-help"
              value={tables}
              onChange={(e) => setTables(e.target.value)}
            />
            <small id="tables-help">
              Number of tables (1..b). Participants 1..b will be hosts.
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="rounds">Number of Rounds</label>
            <input
              type="number"
              id="rounds"
              name="rounds"
              min="1"
              required
              aria-describedby="rounds-help"
              value={rounds}
              onChange={(e) => setRounds(e.target.value)}
            />
            <small id="rounds-help">Number of rounds to schedule</small>
          </div>

          <div className="form-group">
            <label htmlFor="time-limit">Time Limit (seconds)</label>
            <input
              type="number"
              id="time-limit"
              name="time-limit"
              min="1"
              max="300"
              aria-describedby="time-limit-help"
              value={timeLimit}
              onChange={(e) => setTimeLimit(parseInt(e.target.value))}
            />
            <small id="time-limit-help">
              Maximum time for the solver (1-300 seconds)
            </small>
          </div>
        </div>

        <div className="pair-rules-grid">
          <fieldset className="pair-rule">
            <legend>Same-Once Pairs</legend>
            <div className="pairs-header">
              <span className="rule-caption">A connection to make once</span>
              <button
                type="button"
                className="btn-secondary"
                onClick={addSameOncePair}
              >
                + Add Pair
              </button>
            </div>
            <small id="same-once-help">
              These participants should share a table in one round.
            </small>
            <div className="pairs-container">
              {sameOncePairs.map((pair, index) => (
                <PairInput
                  key={index}
                  pair={pair}
                  pairLabel={`Same-once pair ${index + 1}`}
                  helpId="same-once-help"
                  onChange={(field, value) =>
                    updateSameOncePair(index, field, value)
                  }
                  onRemove={() => removeSameOncePair(index)}
                />
              ))}
            </div>
          </fieldset>

          <fieldset className="pair-rule">
            <legend>Never-Together Pairs</legend>
            <div className="pairs-header">
              <span className="rule-caption">A combination to avoid</span>
              <button
                type="button"
                className="btn-secondary"
                onClick={addNeverTogetherPair}
              >
                + Add Pair
              </button>
            </div>
            <small id="never-together-help">
              Keep these participants at separate tables in every round.
            </small>
            <div className="pairs-container">
              {neverTogetherPairs.map((pair, index) => (
                <PairInput
                  key={index}
                  pair={pair}
                  pairLabel={`Never-together pair ${index + 1}`}
                  helpId="never-together-help"
                  onChange={(field, value) =>
                    updateNeverTogetherPair(index, field, value)
                  }
                  onRemove={() => removeNeverTogetherPair(index)}
                />
              ))}
            </div>
          </fieldset>
        </div>

        <button
          type="submit"
          className="btn-primary"
          disabled={loading}
          aria-busy={loading}
        >
          <span className="button-label">
            {loading && (
              <progress
                className="button-spinner"
                aria-label="Generating schedule"
              />
            )}
            <span>
              {loading ? 'Generating schedule…' : 'Generate Schedule'}
            </span>
          </span>
          <span className="button-arrow" aria-hidden="true">
            {loading ? '⋯' : '↗'}
          </span>
        </button>
      </form>
      {loading && (
        <button
          id="cancel-solve"
          type="button"
          className="btn-secondary cancel-solve-button"
          onClick={onCancel}
          disabled={cancelling}
          aria-controls="schedule-form"
          aria-label={cancelling ? 'Stopping solver' : undefined}
        >
          {cancelling ? 'Stopping solver…' : 'Cancel schedule generation'}
        </button>
      )}
    </section>
  );
}

export default ScheduleForm;
