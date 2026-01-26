import React, { createContext, useContext, useState, ReactNode } from 'react';

export type RebuildStep = 'landing' | 'location' | 'preferences-needs' | 'preferences-style' | 'inspiration' | 'budget' | 'matches' | 'details' | 'chat';

interface PropertyData {
  address: string;
  parcelNumber: string;
  damage: string;
  yearBuilt: string;
  useType: string;
  builtArea: string;
  lotArea: string;
  beds: string;
  bath: string;
  detachedUnit: string;
  cornerLot: string;
  totalValue: string;
  landValue: string;
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

interface StyleData {
  uploadedPhotos: string[];
  architectureStyle: string;
  roofType: string;
}

interface InspirationData {
  uploadedIdeas: string[];
  selectedInspiration: number[];
}

interface RebuildContextType {
  currentStep: RebuildStep;
  setCurrentStep: (step: RebuildStep) => void;
  propertyData: PropertyData | null;
  setPropertyData: (data: PropertyData) => void;
  preferencesData: PreferencesData | null;
  setPreferencesData: (data: PreferencesData) => void;
  styleData: StyleData | null;
  setStyleData: (data: StyleData) => void;
  inspirationData: InspirationData | null;
  setInspirationData: (data: InspirationData) => void;
  selectedDesignId: number | null;
  setSelectedDesignId: (id: number) => void;
  resetRebuildFlow: () => void;
}

const RebuildContext = createContext<RebuildContextType | undefined>(undefined);

export const RebuildProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentStep, setCurrentStep] = useState<RebuildStep>('landing');
  const [propertyData, setPropertyData] = useState<PropertyData | null>(null);
  const [preferencesData, setPreferencesData] = useState<PreferencesData | null>(null);
  const [styleData, setStyleData] = useState<StyleData | null>(null);
  const [inspirationData, setInspirationData] = useState<InspirationData | null>(null);
  const [selectedDesignId, setSelectedDesignId] = useState<number | null>(null);

  const resetRebuildFlow = () => {
    setCurrentStep('landing');
    setPropertyData(null);
    setPreferencesData(null);
    setStyleData(null);
    setInspirationData(null);
    setSelectedDesignId(null);
  };

  return (
    <RebuildContext.Provider
      value={{
        currentStep,
        setCurrentStep,
        propertyData,
        setPropertyData,
        preferencesData,
        setPreferencesData,
        styleData,
        setStyleData,
        inspirationData,
        setInspirationData,
        selectedDesignId,
        setSelectedDesignId,
        resetRebuildFlow,
      }}
    >
      {children}
    </RebuildContext.Provider>
  );
};

export const useRebuild = (): RebuildContextType => {
  const context = useContext(RebuildContext);
  if (!context) {
    throw new Error('useRebuild must be used within RebuildProvider');
  }
  return context;
};

export default RebuildContext;
