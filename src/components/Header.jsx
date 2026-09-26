function Header() {
  return (
    <header className="site-header">
      <div className="masthead">
        <p className="masthead-brand">
          <span className="brand-mark" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </span>
          Tablemates
        </p>
        <p className="masthead-note">
          <span className="live-dot" aria-hidden="true" />
          Your schedule stays in your browser
        </p>
      </div>

      <div className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">
            <span className="eyebrow-dot" aria-hidden="true" />A BETTER MIX,
            EVERY ROUND
          </p>
          <h1>
            Round-Table <span>Scheduler</span>
          </h1>
          <p className="subtitle">
            Plan your tables in a couple of minutes. We’ll find a good mix for
            every round.
          </p>
          <div className="hero-details">
            <span className="hero-detail">
              <span className="detail-check" aria-hidden="true">
                ✓
              </span>
              Runs in your browser
            </span>
            <span className="hero-detail">
              <span className="detail-sparkle" aria-hidden="true">
                ✦
              </span>
              CP-SAT + WebAssembly
            </span>
          </div>
        </div>

        <div className="hero-diagram" aria-hidden="true">
          <div className="diagram-orbit" />
          <span className="diagram-seat seat-one">01</span>
          <span className="diagram-seat seat-two">02</span>
          <span className="diagram-seat seat-three">03</span>
          <span className="diagram-seat seat-four">04</span>
          <span className="diagram-seat seat-five">05</span>
          <span className="diagram-seat seat-six">06</span>
          <div className="diagram-table">
            <span>TABLE</span>
            <strong>01</strong>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
