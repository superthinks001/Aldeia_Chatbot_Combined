import React, { useState } from 'react';
import { MessageCircle, Bed, Bath, Layers, Grid, Home as HomeIcon, Plus, Waves, Building, Square, Home } from 'lucide-react';
import './UserPreferencesNeeds.css';

interface UserPreferencesNeedsProps {
  onBack: () => void;
  onNext: (data: PreferencesData) => void;
  initialData?: Partial<PreferencesData>;
}

interface PreferencesData {
  bedrooms: number;
  bathrooms: number;
  stories: number;
  detachedUnit: boolean;
  roomExtension: boolean;
  patio: boolean;
  pool: boolean;
  basement: boolean;
  terrace: boolean;
}

const UserPreferencesNeeds: React.FC<UserPreferencesNeedsProps> = ({
  onBack,
  onNext,
  initialData
}) => {
  const [preferences, setPreferences] = useState<PreferencesData>({
    bedrooms: initialData?.bedrooms || 1,
    bathrooms: initialData?.bathrooms || 1,
    stories: initialData?.stories || 1,
    detachedUnit: initialData?.detachedUnit || false,
    roomExtension: initialData?.roomExtension || false,
    patio: initialData?.patio || false,
    pool: initialData?.pool || false,
    basement: initialData?.basement || false,
    terrace: initialData?.terrace || false,
  });

  const handleNumberChange = (field: 'bedrooms' | 'bathrooms' | 'stories', increment: boolean) => {
    setPreferences(prev => ({
      ...prev,
      [field]: Math.max(1, prev[field] + (increment ? 1 : -1))
    }));
  };

  const toggleFeature = (feature: keyof Omit<PreferencesData, 'bedrooms' | 'bathrooms' | 'stories'>) => {
    setPreferences(prev => ({
      ...prev,
      [feature]: !prev[feature]
    }));
  };

  const handleNext = () => {
    onNext(preferences);
  };

  return (
    <div className="preferences-needs">
      {/* Header */}
      <header className="rebuild-header">
        <div className="logo">
          <div className="logo-icon">
            <Home className="w-4 h-4 text-white" />
          </div>
          <span className="logo-text">aldeia</span>
        </div>
        <a href="#" className="home-link" onClick={(e) => { e.preventDefault(); onBack(); }}>HOME</a>
      </header>

      <div className="preferences-content">
        {/* Left Section */}
        <div className="preferences-left">
          <h1 className="preferences-title">
            What do you like to change in your future rebuild?
          </h1>

          <ul className="preferences-instructions">
            <li>Answer the 3 questions to cover the basics.</li>
            <li>Add optional items on your rebuild list.</li>
            <li>Click next to move forward.</li>
          </ul>
        </div>

        {/* Right Section */}
        <div className="preferences-right">
          <div className="property-address">
            2743 SANTA ROSA AVE ALTADENA CA 91001-1940
          </div>

          {/* Main Options */}
          <div className="main-options">
            {/* Bedrooms */}
            <div className="option-card selected">
              <div className="option-header">
                <Bed className="option-icon" />
                <span>bedrooms</span>
              </div>
              <div className="number-selector">
                <button
                  className="number-btn"
                  onClick={() => handleNumberChange('bedrooms', false)}
                >
                  -
                </button>
                <span className="number-display">{String(preferences.bedrooms).padStart(2, '0')}</span>
                <button
                  className="number-btn"
                  onClick={() => handleNumberChange('bedrooms', true)}
                >
                  +
                </button>
              </div>
            </div>

            {/* Bathrooms */}
            <div className="option-card selected">
              <div className="option-header">
                <Bath className="option-icon" />
                <span>bathrooms</span>
              </div>
              <div className="number-selector">
                <button
                  className="number-btn"
                  onClick={() => handleNumberChange('bathrooms', false)}
                >
                  -
                </button>
                <span className="number-display">{String(preferences.bathrooms).padStart(2, '0')}</span>
                <button
                  className="number-btn"
                  onClick={() => handleNumberChange('bathrooms', true)}
                >
                  +
                </button>
              </div>
            </div>

            {/* Stories */}
            <div className="option-card selected">
              <div className="option-header">
                <Layers className="option-icon" />
                <span>stories</span>
              </div>
              <div className="number-selector">
                <button
                  className="number-btn"
                  onClick={() => handleNumberChange('stories', false)}
                >
                  -
                </button>
                <span className="number-display">{String(preferences.stories).padStart(2, '0')}</span>
                <button
                  className="number-btn"
                  onClick={() => handleNumberChange('stories', true)}
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Optional Features */}
          <div className="optional-features">
            <div
              className={`feature-card ${preferences.detachedUnit ? '' : 'inactive'}`}
              onClick={() => toggleFeature('detachedUnit')}
            >
              <Grid className="feature-icon" />
              <span>detached unit</span>
            </div>

            <div
              className={`feature-card ${preferences.roomExtension ? '' : 'inactive'}`}
              onClick={() => toggleFeature('roomExtension')}
            >
              <Plus className="feature-icon" />
              <span>room extension</span>
            </div>

            <div
              className={`feature-card ${preferences.patio ? '' : 'inactive'}`}
              onClick={() => toggleFeature('patio')}
            >
              <HomeIcon className="feature-icon" />
              <span>patio</span>
            </div>

            <div
              className={`feature-card ${preferences.pool ? '' : 'inactive'}`}
              onClick={() => toggleFeature('pool')}
            >
              <Waves className="feature-icon" />
              <span>pool</span>
            </div>

            <div
              className={`feature-card ${preferences.basement ? '' : 'inactive'}`}
              onClick={() => toggleFeature('basement')}
            >
              <Building className="feature-icon" />
              <span>basement</span>
            </div>

            <div
              className={`feature-card ${preferences.terrace ? '' : 'inactive'}`}
              onClick={() => toggleFeature('terrace')}
            >
              <Square className="feature-icon" />
              <span>terrace</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="preferences-nav">
        <button className="nav-btn nav-btn-back" onClick={onBack}>
          &lt;&lt; BACK
        </button>
        <button className="nav-btn nav-btn-next" onClick={handleNext}>
          NEXT &gt;&gt;
        </button>
      </div>

    </div>
  );
};

export default UserPreferencesNeeds;
