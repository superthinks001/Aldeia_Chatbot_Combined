import React, { useState } from 'react';
import { Home, Play, Download, MessageCircle, CheckCircle } from 'lucide-react';
import './selected-design-details.css';

interface Design {
  id: number;
  name: string;
  match: number;
  architect: string;
  description: string;
  beds: number;
  baths: number;
  sqft: number;
  imageUrl: string;
}

interface SelectedDesignDetailsProps {
  onBack: () => void;
  onContactArchitect: () => void;
  onSaveDesign: () => void;
  onExploreOther: () => void;
  design?: Design;
}

const SelectedDesignDetails: React.FC<SelectedDesignDetailsProps> = ({
  onBack,
  onContactArchitect,
  onSaveDesign,
  onExploreOther,
  design,
}) => {
  const [notes, setNotes] = useState('');

  // Default design data if not provided
  const designData = design || {
    id: 1,
    name: 'Modern Farmhouse',
    match: 88,
    architect: 'Sophia Carter',
    description: 'This Modern Farmhouse design offers a spacious open-concept living area, a gourmet kitchen, and a luxurious master suite. The exterior features a combination of wood and stone, creating a warm and inviting aesthetic. The design also includes energy-efficient features and smart home technology.',
    beds: 3,
    baths: 2,
    sqft: 2200,
    imageUrl: '/placeholder.svg?height=400&width=600&text=Modern+Farmhouse+Design'
  };

  return (
    <div className="design-details">
      {/* Navigation */}
      <header className="design-details-header">
        <button onClick={onBack} className="design-details-logo">
          <div className="design-details-logo-icon">
            <Home className="w-4 h-4 text-white" />
          </div>
          <span className="design-details-logo-text">aldeia</span>
        </button>
        <a href="#" className="design-details-home-link" onClick={(e) => { e.preventDefault(); onBack(); }}>
          HOME
        </a>
      </header>

      <div className="design-details-content">
        <div>
          <p className="design-details-address">2743 SANTA ROSA AVE ALTADENA CA 91001-1940</p>
          <h1 className="design-details-title">{designData.name}</h1>
          <p className="design-details-description">
            Homeowner's preferred style description: A blend of rustic charm and contemporary design, featuring clean
            lines, natural materials, and a focus on functionality and comfort.
          </p>

          <div style={{ marginBottom: '24px' }}>
            <span className="design-details-match-badge">{designData.match}% match</span>
            <span className="design-details-match-text">This design closely aligns with your preferences.</span>
          </div>
        </div>

        {/* Main Design Image */}
        <div className="design-details-section">
          <h2 className="design-details-section-title">Your Pre-approved Design Match</h2>
          <img
            src="/placeholder.svg?height=400&width=600&text=Modern+Farmhouse+Design"
            alt="Modern Farmhouse Design"
            className="design-details-image"
          />
          <p className="design-details-text">
            This Modern Farmhouse design offers a spacious open-concept living area, a gourmet kitchen, and a luxurious
            master suite. The exterior features a combination of wood and stone, creating a warm and inviting aesthetic.
            The design also includes energy-efficient features and smart home technology.
          </p>
        </div>

        {/* AI Generated Concept Video */}
        <div className="design-details-section">
          <h2 className="design-details-section-title">AI Generated Concept Video</h2>
          <div className="design-details-video-section">
            <button
              className="design-details-play-button"
              onClick={() => alert("Playing AI concept video...")}
            >
              <Play className="w-5 h-5" />
              Play Video
            </button>
          </div>
        </div>

        {/* Floor Plan */}
        <div className="design-details-section">
          <h2 className="design-details-section-title">Floor Plan</h2>
          <img
            src="/placeholder.svg?height=400&width=600&text=Floor+Plan"
            alt="Floor Plan"
            className="design-details-floor-plan-image"
          />
          <button
            className="design-details-download-button"
            onClick={() => alert("Downloading design files...")}
          >
            <Download className="w-4 h-4" />
            Download Design
          </button>
        </div>

        {/* Estimated Cost */}
        <div className="design-details-section">
          <h2 className="design-details-section-title">Estimated Cost</h2>
          <div className="design-details-cost">$750,000 - $850,000</div>
          <div className="design-details-certification">
            <CheckCircle className="design-details-certification-icon" />
            Pre-approved Certification
          </div>
        </div>

        {/* Insurance Coverage */}
        <div className="design-details-section">
          <h2 className="design-details-section-title">Insurance Coverage</h2>
          <p className="design-details-insurance-text">
            Based on your property details, your insurance coverage is estimated at $500,000.
          </p>
        </div>

        {/* Go All Electric Discount */}
        <div className="design-details-section">
          <div className="design-details-electric-card">
            <h3 className="design-details-electric-title">Go All Electric Discount</h3>
            <p className="design-details-electric-text">Save up to $5,000 on your rebuild</p>
          </div>
        </div>

        {/* Designer/Architect */}
        <div className="design-details-section">
          <h2 className="design-details-section-title">Designer/Architect</h2>
          <div className="design-details-architect">
            <div className="design-details-architect-avatar">
              <img
                src="/placeholder.svg?height=64&width=64&text=SC"
                alt="Sophia Carter"
              />
            </div>
            <div>
              <h3 className="design-details-architect-name">{designData.architect}</h3>
              <p className="design-details-architect-role">Architect at {designData.architect.includes('Sophia') ? 'RuralMod Designs' : 'Design Studio'}</p>
            </div>
          </div>
        </div>

        {/* Notes Section */}
        <div className="design-details-section">
          <h2 className="design-details-section-title">Notes</h2>
          <textarea
            className="design-details-notes"
            placeholder="Add your notes here..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {/* Action Buttons */}
        <div className="design-details-actions">
          <div className="design-details-actions-primary">
            <button className="design-details-contact-button" onClick={onContactArchitect}>
              Contact with Architect
            </button>
            <button className="design-details-save-button" onClick={onSaveDesign}>
              Save Design
            </button>
          </div>
          <button className="design-details-explore-button" onClick={onExploreOther}>
            Explore Other Designs
          </button>
        </div>
      </div>

    </div>
  );
};

export default SelectedDesignDetails;
