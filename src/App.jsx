import { useState } from 'react';
import ScheduleForm from './components/ScheduleForm';
import ResultsDisplay from './components/ResultsDisplay';
import ErrorMessage from './components/ErrorMessage';
import Header from './components/Header';
import Footer from './components/Footer';
import './App.css';

function App() {
  const [schedule, setSchedule] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleScheduleSubmit = async (formData) => {
    setError(null);
    setLoading(true);

    try {
      const { generateSchedule } = await import('./services/api');
      const data = await generateSchedule(formData);
      setSchedule(data);
    } catch (err) {
      setError(
        `Failed to generate schedule: ${err.message}. Make sure the backend is running and accessible.`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSchedule(null);
    setError(null);
  };

  return (
    <div className="container">
      <Header />
      <div className="main-content">
        {!schedule ? (
          <ScheduleForm onSubmit={handleScheduleSubmit} loading={loading} />
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
