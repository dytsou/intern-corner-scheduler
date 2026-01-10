function PairInput({ pair, onChange, onRemove }) {
  const handleUChange = (e) => {
    const value = e.target.value;
    onChange('u', value === '' ? '' : parseInt(value) || '');
  };

  const handleVChange = (e) => {
    const value = e.target.value;
    onChange('v', value === '' ? '' : parseInt(value) || '');
  };

  return (
    <div className="pair-item">
      <span className="pair-label">Pair:</span>
      <input
        type="number"
        className="pair-u"
        placeholder="Participant 1"
        min="1"
        value={pair.u === '' || pair.u === undefined ? '' : pair.u}
        onChange={handleUChange}
      />
      <span>×</span>
      <input
        type="number"
        className="pair-v"
        placeholder="Participant 2"
        min="1"
        value={pair.v === '' || pair.v === undefined ? '' : pair.v}
        onChange={handleVChange}
      />
      <button type="button" className="remove-pair" onClick={onRemove}>
        Remove
      </button>
    </div>
  );
}

export default PairInput;
