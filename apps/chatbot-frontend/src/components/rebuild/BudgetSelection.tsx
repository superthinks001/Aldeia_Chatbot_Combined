import React, { useState } from 'react';
import { MessageCircle, Home, Zap, CheckCircle } from 'lucide-react';
import { Slider } from '../ui/slider';
import './BudgetSelection.css';

interface BudgetSelectionProps {
  onBack: () => void;
  onNext: (data: BudgetData) => void;
}

interface BudgetData {
  budget: number;
  insurance: number;
  goElectric: boolean;
}

const BudgetSelection: React.FC<BudgetSelectionProps> = ({ onBack, onNext }) => {
  const [budget, setBudget] = useState([550000]);
  const [insurance, setInsurance] = useState([60]);
  const [goElectric, setGoElectric] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleNext = () => {
    onNext({
      budget: budget[0],
      insurance: insurance[0],
      goElectric,
    });
  };

  return (
    <div className="budget-selection">
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

      <div className="budget-content">
        {/* Left Section */}
        <div className="budget-left">
          <h1 className="budget-title">
            What's your budget and insurance coverage?
          </h1>

          <div className="budget-tips">
            <div className="tip-section">
              <h3 className="tip-title">Budgeting Tip:</h3>
              <ul className="tip-list">
                <li>
                  • For a 2,500-3,000 sq ft home in your <span className="highlight-orange">Altadena</span> area, consider a budget of $600,000-900,000.
                </li>
                <li>
                  • Extend your budget beyond, estimated total value of original property if you are adding stories and rooms.
                </li>
              </ul>
            </div>

            <div className="tip-section">
              <h3 className="tip-title">Insurance Tip:</h3>
              <ul className="tip-list">
                <li>• Estimate your insurance coverage based on your provider and policy.</li>
                <li>• 60% of higher coverage policy is ideal.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Right Section */}
        <div className="budget-right">
          <div className="property-info-card">
            <p className="property-address">2743 SANTA ROSA AVE ALTADENA CA 91001-1940</p>

            <div className="property-details-grid">
              <div className="detail-item">
                <p className="detail-label">Total Value</p>
                <p className="detail-value">$497,510</p>
              </div>
              <div className="detail-item">
                <p className="detail-label">Land Value</p>
                <p className="detail-value">$432,086</p>
              </div>
              <div className="detail-item">
                <p className="detail-label">Lot Area (Square Feet)</p>
                <p className="detail-value">7,475</p>
              </div>
              <div className="detail-item">
                <p className="detail-label">Floors</p>
                <p className="detail-value">02</p>
              </div>
              <div className="detail-item">
                <p className="detail-label">Beds</p>
                <p className="detail-value">04</p>
              </div>
              <div className="detail-item">
                <p className="detail-label">Bath</p>
                <p className="detail-value">03</p>
              </div>
              <div className="detail-item">
                <p className="detail-label">Detached Unit</p>
                <p className="detail-value">Y</p>
              </div>
              <div className="detail-item">
                <p className="detail-label">Room Extension</p>
                <p className="detail-value">Y</p>
              </div>
            </div>

            <div className="slider-section">
              <div className="slider-group">
                <h3 className="slider-title">Budget Range</h3>
                <div className="slider-labels">
                  <span>$200,000</span>
                  <span className="slider-value">{formatCurrency(budget[0])}</span>
                  <span>$1,000,000</span>
                </div>
                <div className="budget-slider-wrapper">
                  <Slider
                    value={budget}
                    onValueChange={(value) => setBudget(value)}
                    max={1000000}
                    min={200000}
                    step={10000}
                    className="budget-slider"
                  />
                </div>
              </div>

              <div className="slider-group">
                <h3 className="slider-title">Insurance Coverage</h3>
                <div className="slider-labels">
                  <span>0%</span>
                  <span className="slider-value">{insurance[0]}%</span>
                  <span>100%</span>
                </div>
                <div className="insurance-slider-wrapper">
                  <Slider
                    value={insurance}
                    onValueChange={(value) => setInsurance(value)}
                    max={100}
                    min={0}
                    step={5}
                    className="insurance-slider"
                  />
                </div>
              </div>

              <div
                className={`electric-card ${goElectric ? 'selected' : ''}`}
                onClick={() => setGoElectric(!goElectric)}
              >
                <Zap className="electric-icon" />
                <div className="electric-content">
                  <p className="electric-title">Go All Electric</p>
                  <p className="electric-savings">for $10K savings</p>
                </div>
                <div className={`electric-checkbox ${goElectric ? 'checked' : ''}`}>
                  {goElectric && <CheckCircle className="check-icon" />}
                </div>
                {goElectric && (
                  <div className="electric-message">
                    <p>Great! You saved $10,000 savings by selecting all electric.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="budget-nav">
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

export default BudgetSelection;
