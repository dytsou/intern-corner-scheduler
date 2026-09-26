function PairInput({ pair, pairLabel, helpId, onChange, onRemove }) {
  const handleUChange = (e) => {
    const value = e.target.value;
    onChange('u', value === '' ? '' : parseInt(value) || '');
  };

  const handleVChange = (e) => {
    const value = e.target.value;
    onChange('v', value === '' ? '' : parseInt(value) || '');
  };

  return (
    <fieldset className="pair-item">
      <legend className="visually-hidden">{pairLabel}</legend>
      <span className="pair-label" aria-hidden="true">
        PAIR
      </span>
      <input
        type="number"
        className="pair-u"
        placeholder="Participant 1"
        aria-label="Participant 1"
        min="1"
        inputMode="numeric"
        aria-describedby={helpId}
        value={pair.u === '' || pair.u === undefined ? '' : pair.u}
        onChange={handleUChange}
      />
      <span>×</span>
      <input
        type="number"
        className="pair-v"
        placeholder="Participant 2"
        aria-label="Participant 2"
        min="1"
        inputMode="numeric"
        aria-describedby={helpId}
        value={pair.v === '' || pair.v === undefined ? '' : pair.v}
        onChange={handleVChange}
      />
      <button
        type="button"
        className="remove-pair"
        onClick={onRemove}
        aria-label={`Remove ${pairLabel}`}
      >
        Remove
      </button>
    </fieldset>
  );
}

export default PairInput;
