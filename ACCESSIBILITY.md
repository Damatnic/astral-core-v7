# Accessibility Guide - Astral Core Mental Health Platform

## Overview

This document outlines the comprehensive accessibility features implemented in the Astral Core mental health platform, ensuring WCAG 2.1 AA compliance and specialized considerations for mental health applications.

## 🎯 Accessibility Features

### ✅ WCAG 2.1 AA Compliance
- **Color Contrast**: All text meets 4.5:1 contrast ratio (3:1 for large text)
- **Keyboard Navigation**: Full functionality via keyboard only
- **Screen Reader Support**: Comprehensive ARIA implementation
- **Focus Management**: Clear focus indicators and logical tab order
- **Responsive Design**: Works on all device sizes and orientations

### 🧠 Mental Health Specific Features
- **Crisis-Safe Colors**: Avoids triggering reds, uses calming blues and oranges
- **Reduced Motion Support**: Respects `prefers-reduced-motion` settings
- **Supportive Messaging**: Encouraging feedback for user actions
- **Emergency Access**: Quick keyboard shortcuts for crisis resources
- **Gentle Animations**: Calming transitions that don't overwhelm

## 🛠 Component Library

### Core Accessibility Components

#### VisuallyHidden
Provides content to screen readers while keeping it visually hidden.

```tsx
import { VisuallyHidden, SkipLink, ScreenReaderOnly } from '@/components/ui/accessibility';

// Basic usage
<VisuallyHidden>This text is only for screen readers</VisuallyHidden>

// Skip link (becomes visible on focus)
<SkipLink href="#main-content">Skip to main content</SkipLink>

// Screen reader announcements
<ScreenReaderOnly announce>Form submitted successfully</ScreenReaderOnly>
```

#### FocusManager
Advanced focus management for complex UI patterns.

```tsx
import { FocusManager, ModalFocusManager, MenuFocusManager } from '@/components/ui/accessibility';

// Modal with focus trap
<ModalFocusManager isOpen={isOpen} onClose={() => setIsOpen(false)}>
  <div>Modal content here</div>
</ModalFocusManager>

// Menu with roving tab index
<MenuFocusManager isOpen={isOpen} onClose={() => setIsOpen(false)}>
  <button>Menu Item 1</button>
  <button>Menu Item 2</button>
</MenuFocusManager>

// Custom focus management
<FocusManager 
  trapFocus 
  rovingTabIndex 
  orientation="vertical"
  autoFocus
  onEscape={() => closeDialog()}
>
  <div>Content with managed focus</div>
</FocusManager>
```

#### LiveRegion
ARIA live regions for dynamic content announcements.

```tsx
import { LiveRegion, StatusAnnouncer, ProgressAnnouncer, WellnessAnnouncer } from '@/components/ui/accessibility';

// Basic announcement
<LiveRegion message="Content loaded" priority="polite" />

// Status announcements
<StatusAnnouncer status="Form validation error" type="error" />

// Progress tracking
<ProgressAnnouncer 
  currentStep={2} 
  totalSteps={5} 
  stepName="Personal Information" 
/>

// Mental health specific
<WellnessAnnouncer 
  action="Mood logged successfully" 
  supportiveMessage={true}
/>
```

#### Enhanced Button
Accessibility-enhanced button component.

```tsx
import Button from '@/components/ui/Button';

<Button
  variant="primary"
  iconBefore={<Icon />}
  description="This button submits your mood entry"
  loadingText="Saving your entry..."
  isLoading={isSubmitting}
  dangerous={false} // Uses crisis-safe colors
>
  Save Mood Entry
</Button>
```

#### Enhanced Input
Comprehensive form input with accessibility features.

```tsx
import Input from '@/components/ui/Input';

<Input
  label="How are you feeling today?"
  isRequired
  sensitiveType="mood"
  successMessage="Thank you for sharing"
  showCharacterCount
  maxLength={500}
  iconBefore={<HeartIcon />}
  helperText="Describe your current emotional state"
/>
```

## 🎨 Color Contrast Tools

### ContrastChecker
Validates color combinations for WCAG compliance.

```tsx
import { ContrastChecker, ContrastBadge, MentalHealthColorValidator } from '@/components/ui/accessibility';

// Check specific colors
<ContrastChecker
  foreground="#333333"
  background="#ffffff"
  isLargeText={false}
  level="AA"
  showSuggestions={true}
/>

// Quick badge display
<ContrastBadge foreground="#333" background="#fff" />

// Validate entire mental health palette
<MentalHealthColorValidator />
```

## 🪝 Accessibility Hooks

### Focus Management
```tsx
import { useFocusTrap, useRovingTabIndex, useFocusRestore } from '@/components/ui/accessibility';

// Trap focus within a component
const trapRef = useFocusTrap(isActive);

// Roving tab index for lists
const { containerRef, currentIndex } = useRovingTabIndex('vertical');

// Restore focus after modal
const { saveFocus, restoreFocus } = useFocusRestore();
```

### Announcements
```tsx
import { useAnnouncements, useMentalHealthAccessibility } from '@/components/ui/accessibility';

const { announceMessage, announceError, announceSuccess } = useAnnouncements();
const { announceCrisis, announceWellnessCheckIn } = useMentalHealthAccessibility();

// Announce messages
announceMessage("Navigation updated", "polite");
announceError("Form validation failed");
announceWellnessCheckIn("Calm");
```

### User Preferences
```tsx
import { useAccessibilityPreferences } from '@/components/ui/accessibility';

const { 
  prefersReducedMotion, 
  prefersHighContrast, 
  colorScheme 
} = useAccessibilityPreferences();

// Conditionally disable animations
const animationClass = prefersReducedMotion ? '' : 'animate-fade-in';
```

## 🎹 Keyboard Navigation

### Standard Shortcuts
- **Tab**: Move to next focusable element
- **Shift + Tab**: Move to previous focusable element
- **Enter/Space**: Activate buttons and links
- **Escape**: Close modals, cancel actions, access crisis support
- **Arrow Keys**: Navigate lists and menus
- **Home/End**: Jump to first/last item in lists

### Mental Health Specific
- **Escape**: Quick access to crisis resources
- **Ctrl/Cmd + ?**: Show help and keyboard shortcuts
- **Ctrl/Cmd + S**: Quick save (mood entries, journal)

### Custom Shortcuts
```tsx
import { useKeyboardShortcuts } from '@/components/ui/accessibility';

useKeyboardShortcuts({
  'ctrl+s': () => saveMoodEntry(),
  'ctrl+h': () => showHelp(),
  'escape': () => accessCrisisSupport()
});
```

## 🏗 Skip Navigation

### Basic Implementation
```tsx
import { SkipNavigation, MainContent, Navigation } from '@/components/ui/accessibility';

<SkipNavigation />
<Navigation aria-label="Main navigation">
  {/* Navigation content */}
</Navigation>
<MainContent>
  {/* Main page content */}
</MainContent>
```

### Mental Health Specific
```tsx
import { 
  MentalHealthSkipNavigation, 
  CrisisSupportArea, 
  WellnessDashboardArea 
} from '@/components/ui/accessibility';

<MentalHealthSkipNavigation />
<CrisisSupportArea>
  {/* Crisis resources */}
</CrisisSupportArea>
<WellnessDashboardArea>
  {/* Wellness tracking */}
</WellnessDashboardArea>
```

## 🎨 CSS Utilities

### Mental Health Specific Classes
```css
/* Calming focus styles */
.wellness-focus:focus {
  outline: 3px solid var(--color-success);
}

/* Crisis attention styling */
.crisis-attention {
  border-left: 4px solid var(--color-warning);
  background-color: rgba(243, 156, 18, 0.1);
}

/* Reduced motion transitions */
.calming-transition {
  transition: all var(--duration-normal) ease-in-out;
}

@media (prefers-reduced-motion: reduce) {
  .calming-transition {
    transition: none;
  }
}
```

### Color Variables
```css
:root {
  /* Mental Health Color Palette */
  --color-primary: #4A90E2; /* Calming blue */
  --color-success: #27AE60; /* Safe green */
  --color-warning: #F39C12; /* Orange instead of red */
  --color-danger: #E67E22; /* Crisis-safe orange */
  
  /* Touch targets */
  --min-touch-target: 44px;
}
```

## 📱 Responsive & Mobile

### Touch Targets
- Minimum 44px × 44px for all interactive elements
- Adequate spacing between touch targets
- Large text and clear visual hierarchy

### Mobile Specific
```tsx
// Prevent zoom on iOS form inputs
<input style={{ fontSize: '16px' }} />

// Touch-friendly buttons
<Button className="min-h-[44px] min-w-[44px]">
  Action
</Button>
```

## 🧪 Testing

### Manual Testing Checklist
- [ ] Navigate entire app using only keyboard
- [ ] Test with screen reader (NVDA, JAWS, VoiceOver)
- [ ] Verify color contrast ratios
- [ ] Test with 200% zoom
- [ ] Verify in high contrast mode
- [ ] Test with reduced motion enabled

### Automated Testing
```bash
# Run accessibility tests
npm run test:a11y

# Check color contrast
npm run test:contrast

# Validate ARIA
npm run test:aria
```

### Screen Reader Testing
1. **NVDA** (Windows) - Free
2. **JAWS** (Windows) - Commercial
3. **VoiceOver** (macOS/iOS) - Built-in
4. **TalkBack** (Android) - Built-in

## 🚨 Crisis Support Features

### Emergency Access
- **Escape Key**: Immediate access to crisis resources
- **Always Available**: Crisis hotline information in footer
- **Clear Labeling**: "Crisis Support" clearly marked
- **Quick Exit**: Option to quickly leave the site

### Implementation
```tsx
import { useMentalHealthAccessibility } from '@/components/ui/accessibility';

const { crisisMode, announceCrisis, exitCrisisMode } = useMentalHealthAccessibility();

// Trigger crisis mode
<Button onClick={announceCrisis} variant="danger" dangerous>
  I need immediate help
</Button>
```

## 📊 Performance Considerations

### Accessibility Performance
- **Lazy Loading**: Accessibility components load only when needed
- **Tree Shaking**: Unused accessibility features are removed
- **Minimal Bundle Impact**: ~15KB gzipped for full accessibility suite

### Monitoring
```tsx
// Track accessibility usage
import { announce } from '@/components/ui/accessibility';

// Analytics for accessibility features
announce("Accessibility feature used: Voice navigation");
```

## 🔧 Configuration

### Global Settings
```typescript
// types/accessibility.ts
export interface AccessibilityConfig {
  enableCrisisMode: boolean;
  useCalColors: boolean;
  enableReducedStimulation: boolean;
  emergencyKeyboardShortcuts: boolean;
  supportiveMessaging: boolean;
}
```

### Environment Variables
```env
# Accessibility features
NEXT_PUBLIC_ENABLE_CRISIS_MODE=true
NEXT_PUBLIC_ACCESSIBILITY_LOGGING=true
NEXT_PUBLIC_HIGH_CONTRAST_MODE=auto
```

## 📚 Resources

### WCAG Guidelines
- [WCAG 2.1 AA Guidelines](https://www.w3.org/WAI/WCAG21/quickref/?versions=2.1&levels=aa)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)

### Mental Health Accessibility
- [Mental Health Digital Design Guidelines](https://www.who.int/publications/i/item/9789240031852)
- [Crisis Resource Design Patterns](https://www.crisis-text-line.org/)

### Testing Tools
- [axe DevTools](https://www.deque.com/axe/devtools/)
- [WAVE Web Accessibility Evaluator](https://wave.webaim.org/)
- [Lighthouse Accessibility Audit](https://developers.google.com/web/tools/lighthouse)

## 🤝 Contributing

When adding new features:

1. **Test with screen readers** before submitting
2. **Verify keyboard navigation** works completely
3. **Check color contrast** meets WCAG AA standards
4. **Consider mental health impact** of design decisions
5. **Add accessibility tests** for new components

## 📞 Support

For accessibility issues or questions:
- **Internal**: Contact the accessibility team
- **External**: accessibility@astralcore.com
- **Crisis Support**: 988 (Suicide & Crisis Lifeline)

---

*This accessibility implementation prioritizes user safety and inclusive design, ensuring that mental health support is available to everyone, regardless of their abilities or technologies used.*