
import React, { useState, useEffect } from 'react';
import { Screen } from './types';
import Dashboard from './screens/Dashboard';
import JobQueue from './screens/JobQueue';
import JobDetails from './screens/JobDetails';
import Settings from './screens/Settings';
import UploadCSV from './screens/UploadCSV';
import CostOverview from './screens/CostOverview';
import Blogs from './screens/Blogs';
import Navigation from './components/Navigation';

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>(Screen.DASHBOARD);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  // Simple Hash-based Router simulation
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (Object.values(Screen).includes(hash as Screen)) {
        setCurrentScreen(hash as Screen);
      } else if (hash.startsWith('JOB_DETAILS_')) {
        const id = hash.replace('JOB_DETAILS_', '');
        setSelectedJobId(id);
        setCurrentScreen(Screen.JOB_DETAILS);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // Initial check

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateTo = (screen: Screen, id?: string) => {
    if (id) {
      window.location.hash = `${screen}_${id}`;
    } else {
      window.location.hash = screen;
    }
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case Screen.DASHBOARD:
        return <Dashboard onNavigate={navigateTo} />;
      case Screen.QUEUE:
        return <JobQueue onNavigate={navigateTo} />;
      case Screen.JOB_DETAILS:
        return <JobDetails jobId={selectedJobId || '4921'} onNavigate={navigateTo} />;
      case Screen.SETTINGS:
        return <Settings onNavigate={navigateTo} />;
      case Screen.UPLOAD:
        return <UploadCSV onNavigate={navigateTo} />;
      case Screen.COSTS:
        return <CostOverview onNavigate={navigateTo} />;
      case Screen.BLOGS:
        return <Blogs onNavigate={navigateTo} />;
      default:
        return <Dashboard onNavigate={navigateTo} />;
    }
  };

  return (
    <div className="flex flex-col min-h-screen w-full lg:max-w-5xl mx-auto bg-background-dark relative border-x border-white/5 shadow-2xl">
      {renderScreen()}
      <Navigation currentScreen={currentScreen} onNavigate={navigateTo} />
    </div>
  );
};

export default App;
