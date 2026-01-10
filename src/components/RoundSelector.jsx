function RoundSelector({ numRounds, currentRound, onRoundChange }) {
  return (
    <div className="round-selector">
      {Array.from({ length: numRounds }, (_, i) => (
        <button
          key={i}
          type="button"
          className={`round-btn ${i === currentRound ? 'active' : ''}`}
          onClick={() => onRoundChange(i)}
        >
          Round {i + 1}
        </button>
      ))}
    </div>
  );
}

export default RoundSelector;
