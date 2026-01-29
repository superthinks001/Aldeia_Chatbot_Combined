import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Slider } from './ui/slider';
import { Badge } from './ui/badge';
import SelectedDesignDetails from './selected-design-details';
import { cn } from '../lib/utils';
import {
  Home,
  Users,
  Palette,
  MessageCircle,
  CheckCircle,
  Bed,
  Bath,
  Building,
  Plus,
  ThumbsUp,
  ThumbsDown,
  Share2,
  Zap,
  Instagram,
  Facebook,
  Linkedin,
  Twitter,
  Menu,
  X,
} from 'lucide-react';
import './LandingPage.css';

interface LandingPageProps {
  onLoginClick: () => void;
  onStepNavigation?: (step: string) => void;
  onStartRebuild?: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onLoginClick, onStepNavigation, onStartRebuild }) => {
  const [currentStep, setCurrentStep] = useState('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [formData, setFormData] = useState({
    address: '2743 SANTA ROSA AVE ALTADENA CA 91001-1940',
    bedrooms: 1,
    bathrooms: 1,
    stories: 1,
    budget: [550000],
    insurance: [60],
    goElectric: false,
    selectedFeatures: [] as string[],
    selectedInspiration: [] as number[],
    contactForm: {
      name: '',
      email: '',
      message: '',
    },
    uploadedFiles: [] as string[],
  });

  const toggleFeature = (feature: string) => {
    setFormData((prev) => ({
      ...prev,
      selectedFeatures: prev.selectedFeatures.includes(feature)
        ? prev.selectedFeatures.filter((f) => f !== feature)
        : [...prev.selectedFeatures, feature],
    }));
  };

  const toggleInspiration = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      selectedInspiration: prev.selectedInspiration.includes(index)
        ? prev.selectedInspiration.filter((i) => i !== index)
        : [...prev.selectedInspiration, index],
    }));
  };

  const handleContactFormChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      contactForm: {
        ...prev.contactForm,
        [field]: value,
      },
    }));
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Message sent! Name: ${formData.contactForm.name}, Email: ${formData.contactForm.email}`);
    setFormData((prev) => ({
      ...prev,
      contactForm: { name: '', email: '', message: '' },
    }));
  };

  const handleFileUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.jpg,.jpeg,.png';
    input.multiple = true;

    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files && files.length > 0) {
        const fileNames = Array.from(files).map((file) => file.name);
        setFormData((prev) => ({
          ...prev,
          uploadedFiles: [...prev.uploadedFiles, ...fileNames],
        }));
        alert(`${files.length} file(s) uploaded successfully: ${fileNames.join(', ')}`);
      }
    };

    input.click();
  };

  const toggleElectric = () => {
    setFormData((prev) => ({
      ...prev,
      goElectric: !prev.goElectric,
    }));
  };

  const handleDesignAction = (action: string, designId?: string) => {
    switch (action) {
      case 'like':
        alert('Design liked!');
        break;
      case 'dislike':
        alert('Design disliked!');
        break;
      case 'share':
        alert('Design shared!');
        break;
      case 'play-video':
        alert('Playing AI concept video...');
        break;
      case 'download':
        alert('Downloading design files...');
        break;
      default:
        break;
    }
  };

  const handleContactUs = () => {
    const contactSection = document.querySelector('#contact-section');
    if (contactSection) {
      contactSection.scrollIntoView({ behavior: 'smooth' });
    } else {
      alert('Contact Us - Opening contact form...');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleStepChange = (step: string) => {
    setCurrentStep(step);
    if (onStepNavigation) {
      onStepNavigation(step);
    }
    if (onStartRebuild && step === 'location') {
      onStartRebuild();
    }
  };

  const renderHome = () => (
    <div className="landing-page">
      {/* Navigation */}
      <nav className="landing-nav">
        <div className="landing-nav-logo">
          <div className="landing-nav-logo-icon">
            <Home className="w-4 h-4 text-white" />
          </div>
          <span className="landing-nav-logo-text">aldeia</span>
        </div>

        {/* Desktop Navigation */}
        <div className="landing-nav-links">
          <a href="#" className="landing-nav-link">
            HOMEOWNER
          </a>
          <a href="#" className="landing-nav-link">
            PARTNERS
          </a>
          <a href="#" className="landing-nav-link">
            HOW IT WORKS
          </a>
          <button onClick={handleContactUs} className="landing-nav-link" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            CONTACT US
          </button>
          <Button
            variant="outline"
            className="landing-nav-link"
            style={{ border: '2px solid #ff6b4a', color: '#ff6b4a', background: 'transparent', padding: '8px 16px', borderRadius: '4px' }}
            onClick={onLoginClick}
          >
            LOGIN
          </Button>
        </div>

        {/* Mobile Menu Button */}
        <button className="landing-nav-mobile-toggle" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>

        {/* Mobile Menu */}
        <div className={`landing-nav-mobile-menu ${mobileMenuOpen ? 'open' : ''}`}>
          <a href="#" className="landing-nav-link">
            HOMEOWNER
          </a>
          <a href="#" className="landing-nav-link">
            PARTNERS
          </a>
          <a href="#" className="landing-nav-link">
            HOW IT WORKS
          </a>
          <button onClick={handleContactUs} className="landing-nav-link" style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
            CONTACT US
          </button>
          <Button
            variant="outline"
            style={{ border: '2px solid #ff6b4a', color: '#ff6b4a', background: 'transparent', width: 'fit-content' }}
            onClick={onLoginClick}
          >
            LOGIN
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="landing-hero">
        <div className="landing-hero-content">
          <p className="landing-hero-subtitle">
            A step-by-step roadmap to guide the journey for home rebuilding
          </p>
          <h1 className="landing-hero-title">
            It takes a village to build a village...
            <br />
            Rebuild together, Stronger than ever.
          </h1>
          <p className="landing-hero-description">
            We understand the challenges you face after the wildfires. Our team is here to support you every step of the
            way, from connecting with architects to accessing vital resources. Let's rebuild your home and community,
            together!
          </p>
          <button
            onClick={() => handleStepChange('location')}
            className="landing-cta-button"
          >
            START REBUILD
          </button>
        </div>
      </section>

      {/* Accelerate Section */}
      <section className="landing-features">
        <div className="landing-features-container">
          <h2 className="landing-features-title">Accelerate your Path to Rebuilding</h2>
          <p className="landing-features-subtitle">
            We have streamlined the process to make it accelerated and as smooth as possible for you.
          </p>

          <div className="landing-features-tagline">
            Your Needs. Our Pre-approved Designs.
          </div>

          <div className="landing-features-grid">
            <div className="landing-feature-item">
              <CheckCircle className="landing-feature-icon" />
              <h3 className="landing-feature-title">Confirm rebuild location</h3>
              <p className="landing-feature-description">
                Search your lot address and confirm property details for rebuilding your home.
              </p>
            </div>

            <div className="landing-feature-item">
              <Users className="landing-feature-icon" />
              <h3 className="landing-feature-title">Define your rebuild preferences</h3>
              <p className="landing-feature-description">
                Tell us about your style needs and style preferences of your future home rebuild.
              </p>
            </div>

            <div className="landing-feature-item">
              <Palette className="landing-feature-icon" />
              <h3 className="landing-feature-title">Get quick rebuild home designs</h3>
              <p className="landing-feature-description">
                Our AI will match your lot and rebuild preferences with a range of pre-approved home designs.
              </p>
            </div>

            <div className="landing-feature-item">
              <MessageCircle className="landing-feature-icon" />
              <h3 className="landing-feature-title">Connect with your architect</h3>
              <p className="landing-feature-description">
                Customize your selected home rebuild design and plan by connecting with your architect.
              </p>
            </div>
          </div>

          <div className="landing-features-actions">
            <button
              onClick={() => handleStepChange('location')}
              className="landing-cta-button"
            >
              START REBUILD
            </button>
            <a
              href="#contact-section"
              onClick={handleContactUs}
              className="landing-contact-link"
            >
              CONTACT US
            </a>
          </div>

          {/* Partner Logos */}
          <div className="landing-partners">
            <div className="landing-partner-text">SUPER THINKS</div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact-section" className="landing-contact">
        <div className="landing-contact-container">
          <div>
            <h2 className="landing-contact-title">Contact Us</h2>
            <form className="landing-contact-form" onSubmit={handleContactSubmit}>
              <input
                type="text"
                placeholder="Full Name"
                className="landing-contact-input"
                value={formData.contactForm.name}
                onChange={(e) => handleContactFormChange('name', e.target.value)}
                required
              />
              <input
                type="email"
                placeholder="Email"
                className="landing-contact-input"
                value={formData.contactForm.email}
                onChange={(e) => handleContactFormChange('email', e.target.value)}
                required
              />
              <textarea
                placeholder="Message"
                rows={4}
                className="landing-contact-textarea"
                value={formData.contactForm.message}
                onChange={(e) => handleContactFormChange('message', e.target.value)}
                required
              />
              <button type="submit" className="landing-contact-submit">
                SEND
              </button>
            </form>
          </div>
          <div className="landing-contact-info">
            <div>
              <p className="landing-contact-info-text">
                Send us a message if you have any questions. We are always happy to hear from you and help to guide
                you through the process of rebuilding your future home.
              </p>
              <p className="landing-contact-info-text">
                If you need any immediate guidance while on the rebuild website, try our chatbot you see here.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-footer-container">
          <div className="landing-footer-copyright">© 2025-2028 SuperThinks LLC.</div>
          <div className="landing-footer-nav">
            <a href="#" className="landing-footer-link">
              ABOUT US
            </a>
            <a href="#" className="landing-footer-link">
              PARTNERS
            </a>
            <a href="#" className="landing-footer-link">
              HOW IT WORKS
            </a>
            <button onClick={handleContactUs} className="landing-footer-link" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
              CONTACT US
            </button>
          </div>
          <div className="landing-footer-social">
            <Instagram className="landing-footer-social-icon" />
            <Facebook className="landing-footer-social-icon" />
            <Linkedin className="landing-footer-social-icon" />
            <Twitter className="landing-footer-social-icon" />
          </div>
        </div>
      </footer>

    </div>
  );

  // For now, return only the home view
  // Additional steps (location, style, etc.) can be added later or handled by the parent App component
  return renderHome();
};

export default LandingPage;
