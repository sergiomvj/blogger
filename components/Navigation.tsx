
import React from 'react';
import { Screen } from '../types';

interface NavigationProps {
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
}

const Navigation: React.FC<NavigationProps> = ({ currentScreen, onNavigate }) => {
  const navItems = [
    { id: Screen.DASHBOARD, label: 'Início', icon: 'dashboard' },
    { id: Screen.QUEUE, label: 'Fila', icon: 'layers' },
    { id: Screen.BLOGS, label: 'Sites', icon: 'language' },
    { id: Screen.SETTINGS, label: 'Config', icon: 'settings' },
  ];

  const hiddenOn = [Screen.UPLOAD, Screen.JOB_DETAILS];
  if (hiddenOn.includes(currentScreen)) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 w-full lg:max-w-4xl mx-auto bg-background-dark/95 border-t border-white/10 backdrop-blur-xl z-[100]">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`flex flex-col items-center gap-1 transition-colors ${currentScreen === item.id ? 'text-primary' : 'text-slate-400'
              }`}
          >
            <span className={`material-symbols-outlined ${currentScreen === item.id ? 'filled' : ''}`}>
              {item.icon}
            </span>
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        ))}
      </div>
      {/* iOS Safe area */}
      <div className="h-6 bg-background-dark"></div>
    </nav>
  );
};

export default Navigation;
