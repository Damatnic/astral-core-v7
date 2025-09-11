// Internationalization types for mental health platform

export type SupportedLocale = 'en' | 'es' | 'fr' | 'de' | 'it' | 'pt' | 'ja' | 'ko' | 'zh' | 'ar';

export interface LocaleConfig {
  code: SupportedLocale;
  name: string;
  nativeName: string;
  flag: string;
  dir: 'ltr' | 'rtl';
  region: string;
  dateFormat: string;
  timeFormat: string;
  numberFormat: Intl.NumberFormat;
  currencyCode: string;
}

export interface TranslationNamespace {
  common: CommonTranslations;
  auth: AuthTranslations;
  dashboard: DashboardTranslations;
  wellness: WellnessTranslations;
  journal: JournalTranslations;
  emergency: EmergencyTranslations;
  therapy: TherapyTranslations;
  billing: BillingTranslations;
  settings: SettingsTranslations;
  accessibility: AccessibilityTranslations;
}

export interface CommonTranslations {
  // Navigation
  navigation: {
    home: string;
    dashboard: string;
    journal: string;
    wellness: string;
    therapy: string;
    emergency: string;
    settings: string;
    profile: string;
    logout: string;
    menu: string;
    close: string;
    back: string;
    next: string;
    previous: string;
    skip: string;
    finish: string;
  };

  // Actions
  actions: {
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    view: string;
    add: string;
    remove: string;
    update: string;
    confirm: string;
    submit: string;
    reset: string;
    clear: string;
    search: string;
    filter: string;
    sort: string;
    export: string;
    import: string;
    download: string;
    upload: string;
    share: string;
    copy: string;
  };

  // Status
  status: {
    loading: string;
    saving: string;
    saved: string;
    error: string;
    success: string;
    warning: string;
    info: string;
    online: string;
    offline: string;
    connecting: string;
    connected: string;
    disconnected: string;
  };

  // Time and dates
  time: {
    now: string;
    today: string;
    yesterday: string;
    tomorrow: string;
    thisWeek: string;
    lastWeek: string;
    nextWeek: string;
    thisMonth: string;
    lastMonth: string;
    nextMonth: string;
    morning: string;
    afternoon: string;
    evening: string;
    night: string;
  };

  // Validation
  validation: {
    required: string;
    invalid: string;
    tooShort: string;
    tooLong: string;
    mustMatch: string;
    emailInvalid: string;
    phoneInvalid: string;
    passwordWeak: string;
    passwordMedium: string;
    passwordStrong: string;
  };
}

export interface AuthTranslations {
  login: {
    title: string;
    subtitle: string;
    email: string;
    password: string;
    rememberMe: string;
    forgotPassword: string;
    signIn: string;
    noAccount: string;
    createAccount: string;
    socialLogin: string;
    loginWith: string;
    mfaTitle: string;
    mfaCode: string;
    mfaBackupCode: string;
    useMfa: string;
    useBackupCode: string;
  };

  register: {
    title: string;
    subtitle: string;
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    confirmPassword: string;
    acceptTerms: string;
    privacyPolicy: string;
    termsOfService: string;
    createAccount: string;
    hasAccount: string;
    signIn: string;
    ageVerification: string;
    parentalConsent: string;
  };

  forgotPassword: {
    title: string;
    subtitle: string;
    email: string;
    sendReset: string;
    backToLogin: string;
    checkEmail: string;
    resetSent: string;
  };

  resetPassword: {
    title: string;
    subtitle: string;
    password: string;
    confirmPassword: string;
    resetPassword: string;
    passwordReset: string;
    returnToLogin: string;
  };
}

export interface DashboardTranslations {
  welcome: string;
  welcomeBack: string;
  todayOverview: string;
  quickActions: string;
  recentActivity: string;
  upcomingAppointments: string;
  moodTracker: string;
  journalEntries: string;
  wellnessGoals: string;
  progressSummary: string;
  emergencyResources: string;
  noData: string;
  getStarted: string;
}

export interface WellnessTranslations {
  title: string;
  moodTracking: {
    title: string;
    subtitle: string;
    selectMood: string;
    moodScale: string;
    addNote: string;
    submit: string;
    history: string;
    trends: string;
    insights: string;
    patterns: string;
  };

  goals: {
    title: string;
    create: string;
    edit: string;
    delete: string;
    complete: string;
    progress: string;
    deadline: string;
    description: string;
    category: string;
    priority: string;
    status: string;
  };

  breathing: {
    title: string;
    subtitle: string;
    start: string;
    stop: string;
    breatheIn: string;
    breatheOut: string;
    hold: string;
    duration: string;
    technique: string;
    guided: string;
    custom: string;
  };

  meditation: {
    title: string;
    subtitle: string;
    sessions: string;
    duration: string;
    type: string;
    start: string;
    pause: string;
    resume: string;
    complete: string;
    history: string;
  };
}

export interface JournalTranslations {
  title: string;
  newEntry: string;
  editEntry: string;
  deleteEntry: string;
  saveEntry: string;
  saveDraft: string;
  publish: string;
  entryTitle: string;
  entryContent: string;
  mood: string;
  tags: string;
  privacy: string;
  private: string;
  shared: string;
  searchEntries: string;
  filterByMood: string;
  filterByDate: string;
  emptyJournal: string;
  firstEntry: string;
  entryDeleted: string;
  entrySaved: string;
  prompts: {
    title: string;
    gratitude: string;
    reflection: string;
    goals: string;
    challenges: string;
    growth: string;
    relationships: string;
    selfCare: string;
  };
}

export interface EmergencyTranslations {
  title: string;
  subtitle: string;
  callNow: string;
  textLine: string;
  onlineChat: string;
  resources: string;
  immediateHelp: string;
  crisisLine: string;
  suicidePrevention: string;
  domesticViolence: string;
  substanceAbuse: string;
  mentalHealth: string;
  notAlone: string;
  confidential: string;
  available247: string;
  freeService: string;
  getHelp: string;
  safetyPlan: string;
  copingStrategies: string;
  supportNetwork: string;
  professionalHelp: string;
  localResources: string;
  emergencyContacts: string;
}

export interface TherapyTranslations {
  title: string;
  findTherapist: string;
  appointments: string;
  schedule: string;
  reschedule: string;
  cancel: string;
  upcoming: string;
  past: string;
  notes: string;
  homework: string;
  goals: string;
  progress: string;
  communication: string;
  messaging: string;
  videoCall: string;
  inPerson: string;
  remote: string;
  insurance: string;
  payment: string;
  resources: string;
  exercises: string;
  worksheets: string;
}

export interface BillingTranslations {
  title: string;
  subscription: string;
  plan: string;
  upgrade: string;
  downgrade: string;
  cancel: string;
  billing: string;
  payment: string;
  invoice: string;
  receipt: string;
  history: string;
  method: string;
  card: string;
  account: string;
  update: string;
  expired: string;
  failed: string;
  success: string;
  refund: string;
  dispute: string;
  support: string;
}

export interface SettingsTranslations {
  title: string;
  profile: string;
  account: string;
  privacy: string;
  security: string;
  notifications: string;
  preferences: string;
  language: string;
  theme: string;
  accessibility: string;
  data: string;
  export: string;
  delete: string;
  twoFactor: string;
  enable: string;
  disable: string;
  backup: string;
  restore: string;
  support: string;
  feedback: string;
  about: string;
  version: string;
  legal: string;
  terms: string;
  privacy_policy: string;
}

export interface AccessibilityTranslations {
  skipToMain: string;
  skipToMenu: string;
  openMenu: string;
  closeMenu: string;
  toggleTheme: string;
  increaseFont: string;
  decreaseFont: string;
  resetFont: string;
  highContrast: string;
  reduceMotion: string;
  screenReader: string;
  keyboardNavigation: string;
  focusIndicator: string;
  altText: string;
  longDescription: string;
  dataTable: string;
  sortColumn: string;
  expandCollapse: string;
  currentPage: string;
  totalPages: string;
  loading: string;
  error: string;
  success: string;
  warning: string;
  info: string;
  required: string;
  optional: string;
  newWindow: string;
  externalLink: string;
  downloadFile: string;
}

export type TranslationKey = keyof TranslationNamespace;
export type NestedTranslationKey<T> = T extends object 
  ? { [K in keyof T]: T[K] extends object 
      ? `${string & K}.${NestedTranslationKey<T[K]>}` 
      : string & K 
    }[keyof T]
  : never;

export type FlatTranslationKey = {
  [K in keyof TranslationNamespace]: `${string & K}.${NestedTranslationKey<TranslationNamespace[K]>}`
}[keyof TranslationNamespace];

export interface TranslationFunction {
  <T extends FlatTranslationKey>(key: T, params?: Record<string, string | number>): string;
  (key: string, params?: Record<string, string | number>): string;
}