import { SupportedLocale, LocaleConfig } from './types';

// Supported locales configuration for mental health platform
export const SUPPORTED_LOCALES: Record<SupportedLocale, LocaleConfig> = {
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇺🇸',
    dir: 'ltr',
    region: 'US',
    dateFormat: 'MM/dd/yyyy',
    timeFormat: 'h:mm a',
    numberFormat: new Intl.NumberFormat('en-US'),
    currencyCode: 'USD'
  },
  es: {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    flag: '🇪🇸',
    dir: 'ltr',
    region: 'ES',
    dateFormat: 'dd/MM/yyyy',
    timeFormat: 'HH:mm',
    numberFormat: new Intl.NumberFormat('es-ES'),
    currencyCode: 'EUR'
  },
  fr: {
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
    flag: '🇫🇷',
    dir: 'ltr',
    region: 'FR',
    dateFormat: 'dd/MM/yyyy',
    timeFormat: 'HH:mm',
    numberFormat: new Intl.NumberFormat('fr-FR'),
    currencyCode: 'EUR'
  },
  de: {
    code: 'de',
    name: 'German',
    nativeName: 'Deutsch',
    flag: '🇩🇪',
    dir: 'ltr',
    region: 'DE',
    dateFormat: 'dd.MM.yyyy',
    timeFormat: 'HH:mm',
    numberFormat: new Intl.NumberFormat('de-DE'),
    currencyCode: 'EUR'
  },
  it: {
    code: 'it',
    name: 'Italian',
    nativeName: 'Italiano',
    flag: '🇮🇹',
    dir: 'ltr',
    region: 'IT',
    dateFormat: 'dd/MM/yyyy',
    timeFormat: 'HH:mm',
    numberFormat: new Intl.NumberFormat('it-IT'),
    currencyCode: 'EUR'
  },
  pt: {
    code: 'pt',
    name: 'Portuguese',
    nativeName: 'Português',
    flag: '🇵🇹',
    dir: 'ltr',
    region: 'PT',
    dateFormat: 'dd/MM/yyyy',
    timeFormat: 'HH:mm',
    numberFormat: new Intl.NumberFormat('pt-PT'),
    currencyCode: 'EUR'
  },
  ja: {
    code: 'ja',
    name: 'Japanese',
    nativeName: '日本語',
    flag: '🇯🇵',
    dir: 'ltr',
    region: 'JP',
    dateFormat: 'yyyy/MM/dd',
    timeFormat: 'HH:mm',
    numberFormat: new Intl.NumberFormat('ja-JP'),
    currencyCode: 'JPY'
  },
  ko: {
    code: 'ko',
    name: 'Korean',
    nativeName: '한국어',
    flag: '🇰🇷',
    dir: 'ltr',
    region: 'KR',
    dateFormat: 'yyyy-MM-dd',
    timeFormat: 'HH:mm',
    numberFormat: new Intl.NumberFormat('ko-KR'),
    currencyCode: 'KRW'
  },
  zh: {
    code: 'zh',
    name: 'Chinese',
    nativeName: '中文',
    flag: '🇨🇳',
    dir: 'ltr',
    region: 'CN',
    dateFormat: 'yyyy/MM/dd',
    timeFormat: 'HH:mm',
    numberFormat: new Intl.NumberFormat('zh-CN'),
    currencyCode: 'CNY'
  },
  ar: {
    code: 'ar',
    name: 'Arabic',
    nativeName: 'العربية',
    flag: '🇸🇦',
    dir: 'rtl',
    region: 'SA',
    dateFormat: 'dd/MM/yyyy',
    timeFormat: 'HH:mm',
    numberFormat: new Intl.NumberFormat('ar-SA'),
    currencyCode: 'SAR'
  }
};

export const DEFAULT_LOCALE: SupportedLocale = 'en';

// Fallback chain for translations
export const FALLBACK_LOCALES: Record<SupportedLocale, SupportedLocale[]> = {
  en: [],
  es: ['en'],
  fr: ['en'],
  de: ['en'],
  it: ['en'],
  pt: ['es', 'en'],
  ja: ['en'],
  ko: ['en'],
  zh: ['en'],
  ar: ['en']
};

// Mental health crisis hotlines by locale/region
export const CRISIS_HOTLINES: Record<SupportedLocale, Array<{
  name: string;
  number: string;
  description: string;
  available: string;
  type: 'voice' | 'text' | 'chat' | 'email';
}>> = {
  en: [
    {
      name: '988 Suicide & Crisis Lifeline',
      number: '988',
      description: 'Free and confidential emotional support',
      available: '24/7',
      type: 'voice'
    },
    {
      name: 'Crisis Text Line',
      number: '741741',
      description: 'Text HOME for crisis support',
      available: '24/7',
      type: 'text'
    },
    {
      name: 'National Domestic Violence Hotline',
      number: '1-800-799-7233',
      description: 'Support for domestic violence situations',
      available: '24/7',
      type: 'voice'
    }
  ],
  es: [
    {
      name: 'Línea Nacional de Prevención del Suicidio',
      number: '1-888-628-9454',
      description: 'Apoyo emocional gratuito y confidencial',
      available: '24/7',
      type: 'voice'
    },
    {
      name: 'Línea de Crisis de Texto',
      number: '741741',
      description: 'Envía AYUDA para apoyo en crisis',
      available: '24/7',
      type: 'text'
    }
  ],
  fr: [
    {
      name: 'SOS Amitié',
      number: '09 72 39 40 50',
      description: 'Écoute et soutien psychologique',
      available: '24/7',
      type: 'voice'
    },
    {
      name: 'Suicide Écoute',
      number: '01 45 39 40 00',
      description: 'Prévention du suicide',
      available: '24/7',
      type: 'voice'
    }
  ],
  de: [
    {
      name: 'Telefonseelsorge',
      number: '0800 111 0 111',
      description: 'Kostenlose Beratung und Seelsorge',
      available: '24/7',
      type: 'voice'
    },
    {
      name: 'Nummer gegen Kummer',
      number: '116 111',
      description: 'Kinder- und Jugendtelefon',
      available: 'Mo-Sa 14-20 Uhr',
      type: 'voice'
    }
  ],
  it: [
    {
      name: 'Telefono Amico Italia',
      number: '02 2327 2327',
      description: 'Ascolto e sostegno emotivo',
      available: '24/7',
      type: 'voice'
    }
  ],
  pt: [
    {
      name: 'SOS Voz Amiga',
      number: '213 544 545',
      description: 'Apoio emocional e prevenção do suicídio',
      available: '16h-24h',
      type: 'voice'
    }
  ],
  ja: [
    {
      name: 'いのちの電話',
      number: '0570-783-556',
      description: '自殺予防のための電話相談',
      available: '24時間',
      type: 'voice'
    }
  ],
  ko: [
    {
      name: '생명의 전화',
      number: '1588-9191',
      description: '자살예방을 위한 전화상담',
      available: '24시간',
      type: 'voice'
    }
  ],
  zh: [
    {
      name: '北京危机干预热线',
      number: '400-161-9995',
      description: '心理危机干预和自杀预防',
      available: '24小时',
      type: 'voice'
    }
  ],
  ar: [
    {
      name: 'خط المساعدة النفسية',
      number: '920033360',
      description: 'دعم نفسي مجاني وسري',
      available: '24/7',
      type: 'voice'
    }
  ]
};

// Locale detection configuration
export const LOCALE_DETECTION_CONFIG = {
  // Order of detection methods
  order: ['localStorage', 'navigator', 'header', 'default'] as const,
  
  // Storage key for persisting locale preference
  storageKey: 'astral-locale',
  
  // Cookie configuration
  cookie: {
    name: 'astral-locale',
    maxAge: 365 * 24 * 60 * 60, // 1 year
    sameSite: 'strict' as const,
    secure: process.env.NODE_ENV === 'production'
  },
  
  // Header name for locale detection
  headerName: 'accept-language',
  
  // Enable/disable automatic detection
  autoDetect: true,
  
  // Cache translations in memory
  cache: true,
  
  // Preload critical namespaces
  preload: ['common', 'auth', 'emergency'] as const
};

// Translation loading configuration
export const TRANSLATION_CONFIG = {
  // Base path for translation files
  basePath: '/locales',
  
  // File extension
  extension: '.json',
  
  // Lazy loading strategy
  lazy: true,
  
  // Chunk translations by namespace
  chunked: true,
  
  // Enable development mode features
  development: process.env.NODE_ENV === 'development',
  
  // Fallback loading timeout (ms)
  timeout: 5000,
  
  // Retry failed loads
  retry: {
    attempts: 3,
    delay: 1000
  }
};

// Mental health specific locale features
export const MENTAL_HEALTH_LOCALE_FEATURES = {
  // Cultural considerations for mental health content
  culturalAdaptations: {
    // Cultures where mental health stigma is particularly high
    highStigma: ['ja', 'ko', 'zh', 'ar'],
    
    // Cultures with family-centered approaches
    familyCentered: ['es', 'ar', 'zh', 'ko'],
    
    // Cultures with religious considerations
    religiousConsiderations: ['ar', 'es'],
    
    // Cultures with specific color meanings
    colorMeanings: {
      ar: { avoid: ['yellow'], prefer: ['blue', 'green'] },
      zh: { avoid: ['white'], prefer: ['red', 'gold'] },
      ja: { prefer: ['blue', 'green'], avoid: ['red'] }
    }
  },
  
  // Crisis intervention adaptations
  crisisAdaptations: {
    // Locales requiring family notification considerations
    familyNotification: ['ar', 'zh', 'ko'],
    
    // Locales with specific religious/spiritual support
    spiritualSupport: ['ar', 'es'],
    
    // Locales with different emergency number formats
    emergencyFormats: {
      us: '###',
      international: '+# ### ### ####'
    }
  }
};

export function getLocaleConfig(locale: SupportedLocale): LocaleConfig {
  return SUPPORTED_LOCALES[locale] || SUPPORTED_LOCALES[DEFAULT_LOCALE];
}

export function isRTLLocale(locale: SupportedLocale): boolean {
  return getLocaleConfig(locale).dir === 'rtl';
}

export function getCrisisHotlines(locale: SupportedLocale) {
  return CRISIS_HOTLINES[locale] || CRISIS_HOTLINES[DEFAULT_LOCALE];
}

export function getMentalHealthFeatures(locale: SupportedLocale) {
  const features = MENTAL_HEALTH_LOCALE_FEATURES;
  
  return {
    isHighStigma: features.culturalAdaptations.highStigma.includes(locale),
    isFamilyCentered: features.culturalAdaptations.familyCentered.includes(locale),
    hasReligiousConsiderations: features.culturalAdaptations.religiousConsiderations.includes(locale),
    requiresFamilyNotification: features.crisisAdaptations.familyNotification.includes(locale),
    hasSpiritualSupport: features.crisisAdaptations.spiritualSupport.includes(locale),
    colorPreferences: features.culturalAdaptations.colorMeanings[locale as keyof typeof features.culturalAdaptations.colorMeanings] || undefined
  };
}