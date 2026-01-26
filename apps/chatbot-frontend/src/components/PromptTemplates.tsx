import React, { useState } from 'react';
import './PromptTemplates.css';

interface PromptTemplate {
  id: string;
  title: string;
  prompt: string;
  category: 'rebuild' | 'permit' | 'debris' | 'financial' | 'general';
  icon: string;
}

const PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: 'rebuild_steps',
    title: 'What steps do I take after a fire?',
    prompt: 'What steps do I take after a fire in my area?',
    category: 'rebuild',
    icon: '🏠'
  },
  {
    id: 'debris_removal',
    title: 'Debris removal process',
    prompt: 'How do I opt out of debris removal? What is the deadline?',
    category: 'debris',
    icon: '🗑️'
  },
  {
    id: 'building_permits',
    title: 'Building permits required',
    prompt: 'What building permits do I need for reconstruction?',
    category: 'permit',
    icon: '📋'
  },
  {
    id: 'financial_assistance',
    title: 'Financial assistance programs',
    prompt: 'What financial assistance programs are available for fire recovery?',
    category: 'financial',
    icon: '💰'
  },
  {
    id: 'insurance_claim',
    title: 'Insurance claim process',
    prompt: 'How do I file an insurance claim for fire damage?',
    category: 'financial',
    icon: '📄'
  },
  {
    id: 'contractor_selection',
    title: 'Selecting a contractor',
    prompt: 'How do I select a certified contractor for rebuild?',
    category: 'rebuild',
    icon: '👷'
  },
  {
    id: 'hazardous_materials',
    title: 'Hazardous material removal',
    prompt: 'What is the process for hazardous material removal?',
    category: 'debris',
    icon: '⚠️'
  },
  {
    id: 'timeline_estimate',
    title: 'Rebuild timeline',
    prompt: 'How long does the rebuild process typically take?',
    category: 'rebuild',
    icon: '⏱️'
  }
];

interface PromptTemplatesProps {
  onSelectTemplate: (prompt: string) => void;
  currentStep?: string;
  onHide?: () => void;
}

const PromptTemplates: React.FC<PromptTemplatesProps> = ({ onSelectTemplate, currentStep, onHide }) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);

  // Filter templates based on current step
  const getFilteredTemplates = () => {
    if (!currentStep) return PROMPT_TEMPLATES;
    
    const stepCategoryMap: { [key: string]: string[] } = {
      'location': ['rebuild', 'general'],
      'preferences-style': ['rebuild', 'permit'],
      'preferences-needs': ['rebuild', 'permit'],
      'inspiration': ['rebuild', 'permit'],
      'budget': ['financial', 'rebuild'],
      'matches': ['rebuild', 'general'],
      'details': ['rebuild', 'permit']
    };

    const relevantCategories = stepCategoryMap[currentStep] || ['general'];
    return PROMPT_TEMPLATES.filter(t => relevantCategories.includes(t.category));
  };

  const filteredTemplates = getFilteredTemplates();
  const categories = Array.from(new Set(filteredTemplates.map(t => t.category)));

  const getCategoryName = (category: string): string => {
    const names: { [key: string]: string } = {
      'rebuild': 'Rebuilding',
      'permit': 'Permits',
      'debris': 'Debris Removal',
      'financial': 'Financial',
      'general': 'General'
    };
    return names[category] || category;
  };

  if (!expanded) {
    return (
      <div style={{
        padding: '8px 12px',
        borderBottom: '1px solid #e0e0e0',
        backgroundColor: '#f8f9fa'
      }}>
        <button
          onClick={() => setExpanded(true)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#667eea',
            textDecoration: 'underline',
            fontSize: '12px',
            padding: 0
          }}
        >
          Show Prompt Templates
        </button>
      </div>
    );
  }

  return (
    <div className="prompt-templates-container">
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 12px',
        borderBottom: '1px solid #e0e0e0',
        backgroundColor: '#f8f9fa'
      }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#2c3e50' }}>
          💡 Prompt Templates
        </div>
          <button
            onClick={() => {
              setExpanded(false);
              if (onHide) onHide();
            }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '16px',
              color: '#666',
              padding: '2px 6px'
            }}
            title="Hide templates"
          >
            ×
          </button>
      </div>

      <div style={{ padding: '12px' }}>
        {/* Category Filter */}
        {categories.length > 1 && (
          <div style={{
            display: 'flex',
            gap: 6,
            marginBottom: 12,
            flexWrap: 'wrap'
          }}>
            <button
              onClick={() => setSelectedCategory(null)}
              style={{
                padding: '4px 10px',
                fontSize: 11,
                backgroundColor: selectedCategory === null ? '#667eea' : '#f5f5f5',
                color: selectedCategory === null ? 'white' : '#333',
                border: 'none',
                borderRadius: 12,
                cursor: 'pointer',
                fontWeight: selectedCategory === null ? 600 : 400
              }}
            >
              All
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                style={{
                  padding: '4px 10px',
                  fontSize: 11,
                  backgroundColor: selectedCategory === cat ? '#667eea' : '#f5f5f5',
                  color: selectedCategory === cat ? 'white' : '#333',
                  border: 'none',
                  borderRadius: 12,
                  cursor: 'pointer',
                  fontWeight: selectedCategory === cat ? 600 : 400
                }}
              >
                {getCategoryName(cat)}
              </button>
            ))}
          </div>
        )}

        {/* Templates */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 8
        }}>
          {filteredTemplates
            .filter(t => !selectedCategory || t.category === selectedCategory)
            .map(template => (
              <button
                key={template.id}
                onClick={() => onSelectTemplate(template.prompt)}
                style={{
                  padding: '10px 12px',
                  backgroundColor: 'white',
                  border: '1px solid #e0e0e0',
                  borderRadius: 8,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f0f4ff';
                  e.currentTarget.style.borderColor = '#667eea';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'white';
                  e.currentTarget.style.borderColor = '#e0e0e0';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ fontSize: 18, marginBottom: 4 }}>
                  {template.icon}
                </div>
                <div style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#2c3e50',
                  lineHeight: 1.3
                }}>
                  {template.title}
                </div>
              </button>
            ))}
        </div>
      </div>
    </div>
  );
};

export default PromptTemplates;
