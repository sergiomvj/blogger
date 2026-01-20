
import React, { useState, useEffect } from 'react';
import { Screen } from './types';
import Dashboard from './screens/Dashboard';
import JobQueue from './screens/JobQueue';
import JobDetails from './screens/JobDetails';
import Settings from './screens/Settings';
import UploadCSV from './screens/UploadCSV';
import CostOverview from './screens/CostOverview';
import Blogs from './screens/Blogs';
import Presets from './screens/Presets';
import Media from './screens/Media';
import NewArticle from './screens/NewArticle';
import PreArticleReview from './screens/PreArticleReview';
import Articles from './screens/Articles';
import Login from './screens/Login';
import Register from './screens/Register';
import SEOIntelligence from './screens/SEOIntelligence';
import IntegratorHub from './screens/IntegratorHub';
import Navigation from './components/Navigation';
import Sidebar from './components/Sidebar';
import { supabase } from './services/supabaseClient';
import { Session } from '@supabase/supabase-js';

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentScreen, setCurrentScreen] = useState<Screen>(Screen.DASHBOARD);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  useEffect(() => {
    // Initial check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Simple Hash-based Router simulation
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');

      if (!hash || hash === 'undefined') {
        setCurrentScreen(Screen.DASHBOARD);
        return;
      }

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

  const navigateTo = (screen: Screen | string, id?: string) => {
    if (!screen || screen === 'undefined') return;
    if (id) {
      window.location.hash = `${screen}_${id}`;
    } else {
      window.location.hash = screen;
    }
  };

  const renderScreen = () => {
    if (!session) {
      return <Login onNavigate={navigateTo} onLoginSuccess={() => navigateTo(Screen.DASHBOARD)} />;
    }

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
      case Screen.PRESETS:
        return <Presets onNavigate={navigateTo} />;
      case Screen.MEDIA:
        return <Media onNavigate={navigateTo} />;
      case Screen.NEW_ARTICLE:
        return <NewArticle onNavigate={navigateTo} />;
      case Screen.PRE_ARTICLE_REVIEW:
        return <PreArticleReview onNavigate={navigateTo} />;
      case Screen.ARTICLES:
        return <Articles onNavigate={navigateTo} />;
      case Screen.SEO:
        return <SEOIntelligence onNavigate={navigateTo} />;
      case Screen.INTEGRATOR:
        return <IntegratorHub onNavigate={navigateTo} />;
      default:
        return <Dashboard onNavigate={navigateTo} />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background-dark">
        <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center animate-pulse">
          <span className="material-symbols-outlined text-primary text-3xl">edit_note</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background-dark text-white overflow-hidden">
      {/* Sidebar for Desktop */}
      {session && <Sidebar currentScreen={currentScreen} onNavigate={navigateTo} />}

      <div className="flex-1 flex flex-col min-h-screen relative overflow-y-auto">
        <main className={`flex-1 flex flex-col w-full mx-auto ${session ? (currentScreen === Screen.LOGIN ? '' : 'pb-24 lg:pb-0') : ''}`}>
          <div className={`flex-1 flex flex-col w-full mx-auto ${currentScreen === Screen.LOGIN ? '' : 'max-w-5xl'}`}>
            {renderScreen()}
          </div>
        </main>

        {/* Bottom Tab Bar for Mobile */}
        {session && <Navigation currentScreen={currentScreen} onNavigate={navigateTo} />}
      </div>
    </div>
  );
};

export default App;
