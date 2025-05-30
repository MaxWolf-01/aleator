import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

interface PreferencesContextType {
  animationsEnabled: boolean;
  setAnimationsEnabled: (enabled: boolean) => void;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

const PREFERENCES_KEY = 'aleator_preferences';

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [animationsEnabled, setAnimationsEnabled] = useState(true);

  // Load preferences from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(PREFERENCES_KEY);
    if (stored) {
      try {
        const prefs = JSON.parse(stored);
        if (typeof prefs.animationsEnabled === 'boolean') {
          setAnimationsEnabled(prefs.animationsEnabled);
        }
      } catch {
        // Invalid JSON, use defaults
      }
    }
  }, []);

  // Save preferences when they change
  const updateAnimationsEnabled = (enabled: boolean) => {
    setAnimationsEnabled(enabled);
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify({ animationsEnabled: enabled }));
  };

  return (
    <PreferencesContext.Provider value={{ 
      animationsEnabled, 
      setAnimationsEnabled: updateAnimationsEnabled 
    }}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (context === undefined) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
}