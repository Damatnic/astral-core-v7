/**
 * Accessibility Component Library
 * Comprehensive accessibility utilities and components for WCAG 2.1 AA compliance
 */

// Core accessibility components
export { 
  VisuallyHidden, 
  SkipLink, 
  ScreenReaderOnly 
} from './VisuallyHidden';

export { 
  FocusManager, 
  ModalFocusManager, 
  MenuFocusManager 
} from './FocusManager';

export { 
  LiveRegion, 
  StatusAnnouncer, 
  ProgressAnnouncer, 
  LoadingAnnouncer, 
  WellnessAnnouncer 
} from './LiveRegion';

export { 
  SkipNavigation, 
  MainContent, 
  Navigation, 
  SearchArea, 
  Footer, 
  MentalHealthSkipNavigation, 
  CrisisSupportArea, 
  WellnessDashboardArea 
} from './SkipNavigation';

export { 
  ContrastChecker, 
  ContrastBadge, 
  MentalHealthColorValidator, 
  LiveContrastChecker 
} from './ContrastChecker';

// Accessibility hooks
export {
  useFocusTrap,
  useRovingTabIndex,
  useAnnouncements,
  useAccessibleId,
  useKeyboardShortcuts,
  useAccessibilityPreferences,
  useFocusRestore,
  useMentalHealthAccessibility,
  useAutoFocus
} from '../../../hooks/useAccessibility';

// Accessibility utilities
export {
  getRelativeLuminance,
  getContrastRatio,
  meetsContrastRequirement,
  getAccessibleColorSuggestions,
  generateA11yId,
  isFocusable,
  getFocusableElements,
  announce,
  validateSensitiveInput,
  COLOR_CONTRAST,
  KEYBOARD_KEYS,
  MENTAL_HEALTH_A11Y
} from '../../../utils/accessibility';

// Type definitions for accessibility
export interface AccessibilityReport {
  contrastRatio: number;
  wcagCompliance: {
    AA: boolean;
    AAA: boolean;
  };
  issues: Array<{
    type: 'contrast' | 'focus' | 'aria' | 'structure';
    severity: 'error' | 'warning' | 'info';
    message: string;
    element?: string;
  }>;
  recommendations: string[];
}

export interface MentalHealthAccessibilityConfig {
  enableCrisisMode: boolean;
  useCalColors: boolean;
  enableReducedStimulation: boolean;
  emergencyKeyboardShortcuts: boolean;
  supportiveMessaging: boolean;
}