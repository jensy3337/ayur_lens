import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, History, MessageCircle, ScanLine } from 'lucide-react';
import Disclaimer from './components/Disclaimer';
import Assistant from './components/Assistant';
import HistoryView from './components/HistoryView';
import PlantLibrary from './components/PlantLibrary';
import Scanner from './components/Scanner';
import ayurLensLogo from './assets/ayurlens-logo.png';

const views = [
  {
    id: 'scanner',
    label: 'Scanner',
    icon: ScanLine,
    title: 'Identify Medicinal Plants instantly.',
    subtitle: 'Upload an image to discover AYUSH information, active compounds, and educational usage details.',
  },
  {
    id: 'library',
    label: 'Plant Library',
    icon: BookOpen,
    title: 'Browse the medicinal plant library.',
    subtitle: 'Search local medicinal entries or look up almost any plant from open online sources.',
  },
  {
    id: 'history',
    label: 'History',
    icon: History,
    title: 'Review your recent scans.',
    subtitle: 'Your latest scan results are saved in this browser so you can revisit them during your session.',
  },
  {
    id: 'assistant',
    label: 'AI Assistant',
    icon: MessageCircle,
    title: 'Ask questions on any topic.',
    subtitle: 'Get plant-library answers first, then concise general knowledge summaries for broader questions.',
  },
];

function App() {
  const [activeView, setActiveView] = useState('scanner');
  const [scanHistory, setScanHistory] = useState(() => {
    try {
      const savedHistory = JSON.parse(localStorage.getItem('ayush-lens-history')) || [];
      return Array.isArray(savedHistory) ? savedHistory : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('ayush-lens-history', JSON.stringify(scanHistory));
    } catch {
      try {
        const detailsOnlyHistory = scanHistory.map((scan) => ({
          ...scan,
          imagePreview: '',
        }));
        localStorage.setItem('ayush-lens-history', JSON.stringify(detailsOnlyHistory));
      } catch {
        // Some embedded previews block browser storage. The app still works without saved history.
      }
    }
  }, [scanHistory]);

  const currentView = useMemo(
    () => views.find((view) => view.id === activeView) || views[0],
    [activeView]
  );
  const CurrentIcon = currentView.icon;

  const saveScan = (scan) => {
    setScanHistory((previousScans) => [
      scan,
      ...previousScans.filter((item) => item.id !== scan.id),
    ].slice(0, 10));
  };

  const clearHistory = () => {
    setScanHistory([]);
  };

  const renderActiveView = () => {
    if (activeView === 'library') {
      return <PlantLibrary />;
    }

    if (activeView === 'history') {
      return (
        <HistoryView
          scans={scanHistory}
          onClearHistory={clearHistory}
          onScanAgain={() => setActiveView('scanner')}
        />
      );
    }

    if (activeView === 'assistant') {
      return <Assistant />;
    }

    return <Scanner onScanComplete={saveScan} />;
  };

  return (
    <div className="app-shell min-h-screen bg-gray-50 flex flex-col font-sans">
      <Disclaimer />
      
      <header className="app-header bg-white shadow-sm py-4 px-6 border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="brand-lockup flex items-center space-x-2">
            <img className="brand-mark" src={ayurLensLogo} alt="AyurLens logo" />
            <div>
              <h1 className="brand-title text-2xl font-bold text-gray-800">AyurLens</h1>
              <p className="brand-subtitle">Medicinal plant companion</p>
            </div>
          </div>
          <nav className="app-nav text-sm font-medium text-gray-600">
            {views.map((view) => {
              const Icon = view.icon;
              const isActive = activeView === view.id;

              return (
                <button
                  key={view.id}
                  type="button"
                  className={`nav-button ${isActive ? 'nav-button-active' : ''}`}
                  onClick={() => setActiveView(view.id)}
                >
                  <Icon className="w-4 h-4" />
                  <span>{view.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="app-main flex-grow py-8 px-4">
        <div className="page-intro max-w-3xl mx-auto text-center mb-8">
          <div className="page-icon">
            <CurrentIcon className="w-5 h-5" />
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 mb-4">{currentView.title}</h2>
          <p className="text-gray-600 text-lg">{currentView.subtitle}</p>
        </div>
        
        {renderActiveView()}
      </main>
    </div>
  );
}

export default App;
