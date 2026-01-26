import React, { useState } from 'react';
import { MessageCircle, Upload, Home } from 'lucide-react';
import './RebuildInspiration.css';

interface RebuildInspirationProps {
  onBack: () => void;
  onNext: (data: InspirationData) => void;
  onRebuildSame: () => void;
}

interface InspirationData {
  uploadedIdeas: string[];
  selectedInspiration: number[];
}

const inspirationImages = [
  { id: 1, url: '/api/placeholder/400/300', style: 'Modern Farmhouse' },
  { id: 2, url: '/api/placeholder/400/300', style: 'Craftsman' },
  { id: 3, url: '/api/placeholder/400/300', style: 'Contemporary' },
  { id: 4, url: '/api/placeholder/400/300', style: 'Victorian' },
  { id: 5, url: '/api/placeholder/400/300', style: 'Modern' },
  { id: 6, url: '/api/placeholder/400/300', style: 'Traditional' },
];

const RebuildInspiration: React.FC<RebuildInspirationProps> = ({
  onBack,
  onNext,
  onRebuildSame
}) => {
  const [selectedImages, setSelectedImages] = useState<number[]>([1]);
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const newPhotoUrls = Array.from(files).map(file => URL.createObjectURL(file));
      setUploadedPhotos(prev => [...prev, ...newPhotoUrls]);
    }
  };

  const toggleImage = (id: number) => {
    setSelectedImages(prev =>
      prev.includes(id)
        ? prev.filter(imgId => imgId !== id)
        : [...prev, id]
    );
  };

  const handleNext = () => {
    onNext({
      uploadedIdeas: uploadedPhotos,
      selectedInspiration: selectedImages
    });
  };

  return (
    <div className="rebuild-inspiration">
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

      <div className="inspiration-content">
        {/* Left Section */}
        <div className="inspiration-left">
          <h1 className="inspiration-title">
            Awesome! Do you have ideas or you want me to give inspiration?
          </h1>

          <div className="inspiration-options">
            <div className="option-group">
              <h3>I have ideas</h3>
              <p>Upload a few photos of your home design ideas (exterior views is preferred).</p>
            </div>

            <div className="option-group">
              <h3>Give me inspiration</h3>
              <p>Select a few images that appeal to your style.</p>
            </div>

            <div className="option-group">
              <h3>You can do both!</h3>
            </div>
          </div>
        </div>

        {/* Right Section */}
        <div className="inspiration-right">
          <div className="property-address">
            2743 SANTA ROSA AVE ALTADENA CA 91001-1940
          </div>

          {/* Upload Section */}
          <div className="upload-section">
            <div className="upload-dropzone-inline">
              <Upload className="upload-icon-small" />
              <div className="upload-text-group">
                <p className="upload-text-inline">Drag and drop or browse</p>
                <p className="upload-formats-inline">Supported formats: JPG, PNG, JPEG</p>
              </div>
              <label className="browse-btn-inline">
                Browse
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/jpg"
                  multiple
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
          </div>

          {/* Rebuild Inspiration Gallery */}
          <div className="inspiration-section">
            <h3>Rebuild Inspiration</h3>
            <div className="inspiration-gallery">
              {inspirationImages.map((image) => (
                <div
                  key={image.id}
                  className={`inspiration-card ${selectedImages.includes(image.id) ? 'selected' : ''}`}
                  onClick={() => toggleImage(image.id)}
                >
                  <img src={image.url} alt={image.style} />
                  <div className={`inspiration-checkbox ${selectedImages.includes(image.id) ? 'selected' : ''}`}>
                    {selectedImages.includes(image.id) && (
                      <div className="checkbox-inner"></div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="inspiration-nav">
        <button className="nav-btn nav-btn-back" onClick={onBack}>
          &lt;&lt; BACK
        </button>
        <div className="right-nav">
          <button className="nav-btn nav-btn-secondary" onClick={onRebuildSame}>
            I want to Rebuild Same Style
          </button>
          <button className="nav-btn nav-btn-next" onClick={handleNext}>
            NEXT &gt;&gt;
          </button>
        </div>
      </div>

    </div>
  );
};

export default RebuildInspiration;
