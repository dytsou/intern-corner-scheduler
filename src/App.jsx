import { useState } from 'react';
import ScheduleForm from './components/ScheduleForm';
import ResultsDisplay from './components/ResultsDisplay';
import ErrorMessage from './components/ErrorMessage';
import Header from './components/Header';
import Footer from './components/Footer';
import {
  cancelScheduleSolve,
  solveScheduleLocally,
} from './services/schedulerClient';
import './App.css';

function App() {
  const [schedule, setSchedule] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const handleScheduleSubmit = async (formData) => {
    setError(null);
    setLoading(true);
    setStatusMessage('Generating schedule in your browser…');

    try {
      const result = await solveScheduleLocally(formData, {
        onStatus(stage) {
          if (stage === 'solving') {
            setStatusMessage('Solving in a browser worker…');
          }
        },
      });
      const solverStatus = String(result.solver_status).toUpperCase();

      if (solverStatus === 'OPTIMAL' || solverStatus === 'FEASIBLE') {
        setSchedule(result);
        setStatusMessage(
          `Schedule generated locally. Solver status: ${solverStatus}.`
        );
      } else if (solverStatus === 'INFEASIBLE') {
        setStatusMessage('');
        setError(
          'No schedule satisfies these constraints. Try changing the pair restrictions and submit again.'
        );
      } else if (solverStatus === 'UNKNOWN') {
        setStatusMessage('');
        setError(
          'The browser solver reached the time limit before finding a schedule. Increase the time limit or simplify the inputs and try again.'
        );
      } else if (solverStatus === 'MODEL_INVALID') {
        setStatusMessage('');
        setError(
          'The browser solver rejected this schedule model. Check the inputs and try again.'
        );
      } else {
        setStatusMessage('');
        setError(
          `The browser solver stopped with status ${solverStatus || 'unknown'}. You can review the inputs and try again.`
        );
      }
    } catch (err) {
      if (err?.name === 'AbortError') {
        setStatusMessage(
          'Schedule generation was cancelled. The browser worker has stopped.'
        );
        return;
      }
      const detail = err instanceof Error ? err.message : String(err);
      setStatusMessage('');
      setError(
        `The browser solver could not start or finish. ${detail || 'Please try again.'}`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSchedule = async () => {
    if (cancelling) return;

    setCancelling(true);
    setStatusMessage('Stopping the browser worker…');
    setError(null);
    try {
      await cancelScheduleSolve();
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      setStatusMessage('The browser worker could not be stopped.');
      setError(detail || 'Try again after the current solve finishes.');
    } finally {
      setCancelling(false);
    }
  };

  const handleReset = () => {
    setSchedule(null);
    setError(null);
    setStatusMessage('');
  };

  return (
    <div className="container">
      <Header />
      <div className="main-content">
        {statusMessage && (
          <p
            className="solver-status"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {statusMessage}
          </p>
        )}
        {!schedule ? (
          <ScheduleForm
            onSubmit={handleScheduleSubmit}
            onCancel={handleCancelSchedule}
            loading={loading}
            cancelling={cancelling}
          />
        ) : (
          <ResultsDisplay schedule={schedule} onReset={handleReset} />
        )}
        {error && (
          <ErrorMessage message={error} onDismiss={() => setError(null)} />
        )}
      </div>
      <Footer />
    </div>
  );
}

export default App;
