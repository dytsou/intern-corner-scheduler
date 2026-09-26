import LoadingSpinner from './LoadingSpinner';

function Header() {
  return (
    <header className="site-header">
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
        </div>

        <div className="hero-loading" aria-hidden="true">
          <LoadingSpinner />
          <span className="hero-loading-label">MIXING TABLES</span>
        </div>
      </div>
    </header>
  );
}

export default Header;
