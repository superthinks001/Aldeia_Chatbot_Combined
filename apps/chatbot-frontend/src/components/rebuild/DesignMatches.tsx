import React, { useState } from 'react';
import { MessageCircle, ThumbsUp, ThumbsDown, Share2, Home } from 'lucide-react';
import './DesignMatches.css';

interface DesignMatchesProps {
  onBack: () => void;
  onSelectDesign: (designId: number) => void;
  onRebuildSame: () => void;
}

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

const designs: Design[] = [
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

const DesignMatches: React.FC<DesignMatchesProps> = ({
  onBack,
  onSelectDesign,
  onRebuildSame
}) => {
  const [liked, setLiked] = useState<{[key: number]: boolean}>({});
  const [disliked, setDisliked] = useState<{[key: number]: boolean}>({});

  const handleLike = (id: number) => {
    setLiked(prev => ({ ...prev, [id]: !prev[id] }));
    if (disliked[id]) {
      setDisliked(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleDislike = (id: number) => {
    setDisliked(prev => ({ ...prev, [id]: !prev[id] }));
    if (liked[id]) {
      setLiked(prev => ({ ...prev, [id]: false }));
    }
  };

  return (
    <div className="design-matches">
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

      <div className="matches-content">
        {/* Left Section */}
        <div className="matches-left">
          <h1 className="matches-title">
            Based on our AI algorithm<sup>TM</sup> your style is awesome!
          </h1>

          <div className="style-description">
            <h3>Main Style: <span className="style-highlight">Contemporary</span></h3>
            <p>
              Your home is a sanctuary of sharp lines, open space, and whatever's trending—in a timeless way.
              You're the type that speaks minimalism with just enough warmth to say, "I live here." Big windows
              and negative spaces, aren't just details—they're your love language.
            </p>
          </div>

          <div className="sub-style">
            <h4>Sub-style 1: Midcentury Modern</h4>
            <p>
              You live where nostalgia meets innovation. With palm trees swaying outside your clerestory windows,
              you embody the laid-back glamour of L.A.'s golden design age.
            </p>
          </div>

          <div className="sub-style">
            <h4>Sub-style 2: Mediterranean</h4>
            <p>
              You're the one who brings the Amalfi Coast to West L.A. Terracotta tiles, and wrought iron details
              give your home a timeless charm — without feeling dated.
            </p>
          </div>
        </div>

        {/* Right Section */}
        <div className="matches-right">
          <div className="property-address">
            2743 SANTA ROSA AVE ALTADENA CA 91001-1940
          </div>

          <h2 className="section-title">Your Personalized Pre-approved Rebuild Matches</h2>

          {/* Design Cards */}
          <div className="design-list">
            {designs.map((design) => (
              <div 
                key={design.id} 
                className="design-match-card"
                onClick={() => onSelectDesign(design.id)}
                style={{ cursor: 'pointer' }}
              >
                <div className="design-image-section">
                  <img src={design.imageUrl} alt={design.name} />
                  <div className="match-badge">{design.match}% Match</div>
                </div>

                <div className="design-info-section">
                  <div className="design-header">
                    <h3>{design.name}</h3>
                    <p className="architect-name">by, {design.architect}</p>
                  </div>

                  <p className="design-description">{design.description}</p>

                  <div className="design-specs">
                    <span>{design.beds} beds • {design.baths} baths • {design.sqft.toLocaleString()} sq ft</span>
                  </div>

                  <div className="design-actions">
                    <button
                      className={`action-btn like-btn ${liked[design.id] ? 'active' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLike(design.id);
                      }}
                    >
                      <ThumbsUp />
                    </button>
                    <button
                      className={`action-btn dislike-btn ${disliked[design.id] ? 'active' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDislike(design.id);
                      }}
                    >
                      <ThumbsDown />
                    </button>
                    <button
                      className="action-btn share-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        alert('Share design');
                      }}
                    >
                      <Share2 />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="matches-nav">
        <button className="nav-btn nav-btn-back" onClick={onBack}>
          &lt;&lt; BACK
        </button>
        <div className="right-nav">
          <button className="nav-btn nav-btn-secondary" onClick={onRebuildSame}>
            I want to Rebuild Same Style
          </button>
          <button className="nav-btn nav-btn-next" onClick={() => onSelectDesign(designs[0].id)}>
            NEXT &gt;&gt;
          </button>
        </div>
      </div>

    </div>
  );
};

export default DesignMatches;
