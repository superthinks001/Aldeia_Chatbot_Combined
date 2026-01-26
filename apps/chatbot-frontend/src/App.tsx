import React, { useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import { RebuildProvider, useRebuild } from './contexts/RebuildContext';
import LandingPage from './components/LandingPage';
import LoginForm from './components/auth/LoginForm';
import RegisterForm from './components/auth/RegisterForm';
import ChatWidget from './components/ChatWidget';
import FloatingChatbotIcon from './components/FloatingChatbotIcon';
import BiasLogsAdmin from './components/BiasLogsAdmin';
import AdminDashboard from './components/AdminDashboard';
import LocationConfirmation from './components/rebuild/LocationConfirmation';
import UserPreferencesNeeds from './components/rebuild/UserPreferencesNeeds';
import UserPreferencesStyle from './components/rebuild/UserPreferencesStyle';
import RebuildInspiration from './components/rebuild/RebuildInspiration';
import BudgetSelection from './components/rebuild/BudgetSelection';
import DesignMatches from './components/rebuild/DesignMatches';
import SelectedDesignDetails from './components/selected-design-details';
import './App.css';

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const {
    currentStep,
    setCurrentStep,
    setPropertyData,
    preferencesData,
    setPreferencesData,
    setStyleData,
    inspirationData,
    setInspirationData,
    selectedDesignId,
    setSelectedDesignId,
  } = useRebuild();
  const [showRegister, setShowRegister] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const path = window.location.pathname;

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="app-loading">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  // Show landing page if not authenticated and auth not requested
  if (!isAuthenticated && !showAuth && currentStep === 'landing') {
    return (
      <>
        <LandingPage 
          onLoginClick={() => {
            setShowAuth(true);
            setCurrentStep('location');
          }}
          onStartRebuild={() => {
            setCurrentStep('location');
          }}
        />
        <FloatingChatbotIcon />
      </>
    );
  }

  // Show auth forms if not authenticated but auth requested
  if (!isAuthenticated && showAuth) {
    return (
      <div className="app">
        {showRegister ? (
          <RegisterForm
            onSwitchToLogin={() => setShowRegister(false)}
            onRegisterSuccess={() => {
              setShowRegister(false);
              setCurrentStep('location');
            }}
          />
        ) : (
          <LoginForm
            onSwitchToRegister={() => setShowRegister(true)}
          />
        )}
      </div>
    );
  }

  // Admin routes (protected)
  if (path === '/admin') return <AdminDashboard />;
  if (path === '/admin/bias-logs') return <BiasLogsAdmin />;

  // Rebuild flow (can be accessed with or without auth for demo purposes)
  if (currentStep === 'location') {
    return (
      <>
        <LocationConfirmation
          onBack={() => setCurrentStep('landing')}
          onNext={(data) => {
            setPropertyData(data);
            setCurrentStep('preferences-style');
          }}
          onRebuildNew={() => setCurrentStep('inspiration')}
        />
        <FloatingChatbotIcon />
      </>
    );
  }

  if (currentStep === 'preferences-style') {
    return (
      <>
        <UserPreferencesStyle
          onBack={() => setCurrentStep('location')}
          onNext={(data) => {
            setStyleData(data);
            setCurrentStep('preferences-needs');
          }}
          onRebuildNew={() => setCurrentStep('inspiration')}
        />
        <FloatingChatbotIcon />
      </>
    );
  }

  if (currentStep === 'preferences-needs') {
    return (
      <>
        <UserPreferencesNeeds
          onBack={() => setCurrentStep('preferences-style')}
          onNext={(data) => {
            setPreferencesData(data);
            setCurrentStep('budget');
          }}
        />
        <FloatingChatbotIcon />
      </>
    );
  }

  if (currentStep === 'inspiration') {
    return (
      <>
        <RebuildInspiration
          onBack={() => setCurrentStep('preferences-style')}
          onNext={(data) => {
            setInspirationData(data);
            setCurrentStep('budget');
          }}
          onRebuildSame={() => setCurrentStep('preferences-style')}
        />
        <FloatingChatbotIcon />
      </>
    );
  }

  if (currentStep === 'budget') {
    // Determine where to go back based on the previous step
    const getBudgetBackStep = () => {
      // If we have preferences data, we came from preferences-needs
      // If we have inspiration data, we came from inspiration
      if (preferencesData) return 'preferences-needs';
      if (inspirationData) return 'inspiration';
      return 'inspiration'; // default
    };
    
    return (
      <>
        <BudgetSelection
          onBack={() => setCurrentStep(getBudgetBackStep())}
          onNext={(data) => {
            setCurrentStep('matches');
          }}
        />
        <FloatingChatbotIcon />
      </>
    );
  }

  if (currentStep === 'matches') {
    return (
      <>
        <DesignMatches
          onBack={() => setCurrentStep('budget')}
          onSelectDesign={(id) => {
            setSelectedDesignId(id);
            setCurrentStep('details');
          }}
          onRebuildSame={() => setCurrentStep('preferences-style')}
        />
        <FloatingChatbotIcon />
      </>
    );
  }

  if (currentStep === 'details') {
    // Get the selected design data
    const designs = [
      {
        id: 1,
        name: 'Modern Barn',
        match: 95,
        architect: 'Sophia Carter Designs LLC',
        description: 'This design maximizes natural light and creates a spacious living area, perfect for family gatherings.',
        beds: 3,
        baths: 2,
        sqft: 2200,
        imageUrl: '/api/placeholder/600/400'
      },
      {
        id: 2,
        name: 'Craftsman Contemporary',
        match: 88,
        architect: '8th Wave Architects',
        description: 'Features a large covered patio and a gourmet kitchen, ideal for entertaining.',
        beds: 4,
        baths: 3,
        sqft: 2800,
        imageUrl: '/api/placeholder/600/400'
      }
    ];
    const selectedDesign = designs.find(d => d.id === selectedDesignId) || designs[0];
    
    return (
      <>
        <SelectedDesignDetails
          onBack={() => setCurrentStep('matches')}
          onContactArchitect={() => {
            // Handle architect contact
            console.log('Contact architect');
          }}
          onSaveDesign={() => {
            // Handle save design
            console.log('Save design');
          }}
          onExploreOther={() => setCurrentStep('matches')}
          design={selectedDesign}
        />
        <FloatingChatbotIcon />
      </>
    );
  }

  // Main app (authenticated) - Chat interface
  if (currentStep === 'chat' || (isAuthenticated && currentStep === 'landing')) {
    return (
      <div className="app">
        <header className="app-header">
          <h1>Aldeia Fire Recovery Assistant</h1>
          <div className="user-info">
            <span>Welcome, {user?.name}</span>
          </div>
        </header>

        <main className="app-main">
          <ChatWidget />
        </main>
      </div>
    );
  }

  // Default to landing page
  return (
    <>
      <LandingPage 
        onLoginClick={() => {
          setShowAuth(true);
          setCurrentStep('location');
        }}
        onStartRebuild={() => {
          setCurrentStep('location');
        }}
      />
      <FloatingChatbotIcon />
    </>
  );
};

const App: React.FC = () => {
  return (
    <RebuildProvider>
      <AppContent />
    </RebuildProvider>
  );
};

export default App;
