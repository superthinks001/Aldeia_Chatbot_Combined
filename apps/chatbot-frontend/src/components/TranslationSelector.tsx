import React, { useState, useEffect } from 'react';
import TranslationService, { SupportedLanguage } from '../services/translation.service';
import { Globe } from 'lucide-react';
import './TranslationSelector.css';

interface TranslationSelectorProps {
  currentLanguage: string;
  onLanguageChange: (language: string) => void;
  showLabel?: boolean;
  size?: 'small' | 'medium' | 'large';
}

const TranslationSelector: React.FC<TranslationSelectorProps> = ({
  currentLanguage,
  onLanguageChange,
  showLabel = true,
  size = 'medium'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [supportedLanguages] = useState<SupportedLanguage[]>(
    TranslationService.getSupportedLanguages()
  );

  const currentLang = supportedLanguages.find(l => l.code === currentLanguage) || supportedLanguages[0];

  const sizeStyles = {
    small: { fontSize: '11px', padding: '4px 8px', iconSize: 14 },
    medium: { fontSize: '13px', padding: '6px 12px', iconSize: 16 },
    large: { fontSize: '15px', padding: '8px 16px', iconSize: 18 }
  };

  const styles = sizeStyles[size];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.translation-selector')) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="translation-selector">
      {showLabel && (
        <label className="translation-label" style={{ fontSize: styles.fontSize }}>
          Language:
        </label>
      )}
      <div className="translation-dropdown-wrapper">
        <button
          className="translation-button"
          onClick={() => setIsOpen(!isOpen)}
          style={{
            fontSize: styles.fontSize,
            padding: styles.padding,
          }}
          title={`Current language: ${currentLang.name}`}
        >
          <Globe size={styles.iconSize} />
          <span className="translation-button-text">{currentLang.name}</span>
          <span className="translation-arrow">{isOpen ? '▲' : '▼'}</span>
        </button>

        {isOpen && (
          <div className="translation-dropdown">
            <div className="translation-dropdown-header">
              Select Language
            </div>
            <div className="translation-dropdown-list">
              {supportedLanguages.map((lang) => (
                <button
                  key={lang.code}
                  className={`translation-option ${currentLanguage === lang.code ? 'active' : ''}`}
                  onClick={() => {
                    onLanguageChange(lang.code);
                    setIsOpen(false);
                  }}
                  style={{ fontSize: styles.fontSize }}
                >
                  <span className="translation-option-name">{lang.name}</span>
                  {currentLanguage === lang.code && (
                    <span className="translation-check">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TranslationSelector;
