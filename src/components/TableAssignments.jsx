function TableAssignments({ schedule, currentRound }) {
  const roundAssignments = schedule.assignments[currentRound];

  return (
    <div className="assignments-container">
      <div className="round-assignment active">
        <h3 className="round-title">Round {currentRound + 1}</h3>
        <div className="tables-grid">
          {roundAssignments.map((table, tableIndex) => (
            <div key={tableIndex} className="table-card">
              <div className="table-header">
                <span className="table-number">Table {tableIndex + 1}</span>
                <span className="table-size">
                  {table.length} participant{table.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="participants-list">
                {table.map((participant) => {
                  const isHost = participant <= schedule.tables;
                  return (
                    <span
                      key={participant}
                      className={`participant-badge ${isHost ? 'host' : 'guest'}`}
                    >
                      P{participant}
                      {isHost ? ' (Host)' : ''}
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default TableAssignments;
