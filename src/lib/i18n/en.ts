// English translation table. Source of truth for the i18n key set —
// every key here must appear in every other language file, and every
// {placeholder} the value uses must be passed to t() at the call site.

export const en = {
  // ── tabs / nav
  'tab.day': 'Day',
  'tab.month': 'Month',
  'tab.festivals': 'Festivals',
  'tab.kundli': 'Kundli',
  'tab.match': 'Milan',
  'nav.back': 'Back',
  'nav.skipToContent': 'Skip to content',
  'nav.openSettings': 'Open settings',
  'nav.themeAuto': 'Switch to light theme',
  'nav.themeLight': 'Switch to dark theme',
  'nav.themeDark': 'Switch to auto theme',
  'nav.location': 'Change location',
  'nav.switchLanguage': 'Switch to Hindi',
  'nav.prevMonth': 'Previous month',
  'nav.nextMonth': 'Next month',
  'nav.prevYear': 'Previous year',
  'nav.nextYear': 'Next year',
  'nav.previousDay': 'Previous day',
  'nav.nextDay': 'Next day',

  // ── masthead
  'masthead.title': 'Panchanga',
  // Cross-language kicker shown above/below the main title. In English
  // mode this displays in Devanagari; in Hindi mode it's the Latin
  // transliteration. The same swap applies to section headings.
  'masthead.kicker': 'पञ्चाङ्ग',
  // Era labels include "year/सम्वत" so the subline reads as a complete
  // phrase ("Vikram year 2083") rather than just an era + number.
  'masthead.vikram': 'Vikram year',
  'masthead.shaka': 'Shaka year',

  // ── day card / hero
  'paksha.shukla': 'Shukla Paksha',
  'paksha.krishna': 'Krishna Paksha',
  'masa.adhika': 'Adhika',
  'masa.kshaya': 'Kshaya',
  'system.purnimanta': 'Purnimanta',
  'system.amanta': 'Amanta',
  // The tithi-meta line is built from a "before/after" pair so the
  // syntactic order can flip between languages without HTML in strings.
  // English: "ends 08:27 · then Shashthi"
  'tithi.endsBefore': 'ends ',
  'tithi.endsAfter': '',
  'tithi.then': 'then',
  'tithi.upto': 'upto',
  'tithi.allDay': 'all day',
  'moon.lit': '{percent}% lit',

  // ── moon phases
  'moonPhase.new': 'New Moon',
  'moonPhase.waxingCrescent': 'Waxing Crescent',
  'moonPhase.firstQuarter': 'First Quarter',
  'moonPhase.waxingGibbous': 'Waxing Gibbous',
  'moonPhase.full': 'Full Moon',
  'moonPhase.waningGibbous': 'Waning Gibbous',
  'moonPhase.lastQuarter': 'Last Quarter',
  'moonPhase.waningCrescent': 'Waning Crescent',

  // ── timings strip
  'timing.sunrise': 'Sunrise',
  'timing.sunset': 'Sunset',
  'timing.moonrise': 'Moonrise',
  'timing.moonset': 'Moonset',

  // ── anga table
  'anga.tithi': 'Tithi',
  'anga.nakshatra': 'Nakshatra',
  'anga.yoga': 'Yoga',
  'anga.karana': 'Karana',
  'anga.vara': 'Vara',
  'anga.pada': 'Pada',

  // ── section headings
  'section.panchanga': 'Panchanga',
  'section.muhurta': 'Muhurta',
  'section.year': 'Year',
  'section.upcoming': 'Upcoming',
  // Per-section kickers (the small text next to each h2). English mode
  // renders these in Devanagari; Hindi mode renders Latin so the
  // ornament reads as a cross-language gloss either way.
  'kicker.panchanga': 'पञ्चाङ्ग',
  'kicker.muhurta': 'मुहूर्त',
  'kicker.year': 'सम्वत्',
  'kicker.location': 'स्थान',
  'kicker.calculation': 'गणित',
  'kicker.display': 'प्रदर्शन',
  'kicker.dataPrivacy': 'गोपनीयता',
  'kicker.about': 'परिचय',

  // ── muhurta
  'muhurta.rahuKaal': 'Rahu Kaal',
  'muhurta.yamaganda': 'Yamaganda',
  'muhurta.gulika': 'Gulika Kaal',
  'muhurta.abhijit': 'Abhijit Muhurta',
  'muhurta.brahmaMuhurta': 'Brahma Muhurta',
  'muhurta.pratahSandhya': 'Pratah Sandhya',
  'muhurta.vijayaMuhurta': 'Vijaya Muhurta',
  'muhurta.godhuli': 'Godhuli Muhurta',
  'muhurta.sayahnaSandhya': 'Sayahna Sandhya',
  'muhurta.nishitaKaal': 'Nishita Kaal',
  'muhurta.inauspicious': 'inauspicious',
  'muhurta.auspicious': 'auspicious',
  'muhurta.preDawn': 'pre-dawn',
  'muhurta.twilight': 'twilight',
  'muhurta.afternoon': 'afternoon',
  'muhurta.sunset': 'around sunset',
  'muhurta.night': 'midnight',

  // ── year card
  'year.vikrama': 'Vikrama',
  'year.shaka': 'Shaka',
  'year.kali': 'Kaliyuga',
  'year.ritu': 'Ritu',
  'year.ayana': 'Ayana',
  'year.uttarayana': 'Uttarayana',
  'year.dakshinayana': 'Dakshinayana',
  'year.suryaRashi': 'Surya Rashi',
  'year.chandraRashi': 'Chandra Rashi',
  'year.sankranti': 'Sankranti',

  // ── ritus
  'ritu.vasanta': 'Vasanta',
  'ritu.grishma': 'Grishma',
  'ritu.varsha': 'Varsha',
  'ritu.sharad': 'Sharad',
  'ritu.hemanta': 'Hemanta',
  'ritu.shishira': 'Shishira',

  // ── varas (weekday names — Sanskrit Hindi same)
  'vara.sunday': 'Ravivara',
  'vara.monday': 'Somavara',
  'vara.tuesday': 'Mangalavara',
  'vara.wednesday': 'Budhavara',
  'vara.thursday': 'Guruvara',
  'vara.friday': 'Shukravara',
  'vara.saturday': 'Shanivara',

  // ── short weekday for grid / pager
  'wd.sun': 'Sun',
  'wd.mon': 'Mon',
  'wd.tue': 'Tue',
  'wd.wed': 'Wed',
  'wd.thu': 'Thu',
  'wd.fri': 'Fri',
  'wd.sat': 'Sat',

  // ── festivals
  'fest.todayLabel': 'Festival Today',
  'fest.todayLabelMulti': 'Today',
  'fest.festivalsYear': 'Festivals · {year}',
  'fest.today': 'today',
  'fest.inDays': 'in {days} days',
  'fest.inOneDay': 'in 1 day',
  'fest.daysAgo': '{days} days ago',
  'fest.oneDayAgo': '1 day ago',
  'fest.computing': "Computing the year's festivals…",
  'fest.invalidYear': 'Invalid year: {year}',

  // ── month / festival legend
  'legend.shuklaPaksha': 'Shukla Paksha',
  'legend.krishnaPaksha': 'Krishna Paksha',
  'legend.festival': 'Festival',

  // ── day-pager
  'pager.jumpToToday': 'Jump to today',
  'pager.pickDate': 'Jump to date',

  // ── settings cards
  'settings.title': 'Settings',
  'settings.location': 'Location',
  'settings.locationDesc': "All computations are anchored to this place's local sunrise.",
  'settings.search': 'Search',
  'settings.searchCity': 'Search a city…',
  'settings.useMyLocation': 'Use my location',
  'settings.locating': 'Locating…',
  'settings.currentLocation': 'Current:',
  'settings.noLocation': 'No location selected — search or use your current location.',
  'settings.calculation': 'Calculation',
  'settings.calculationDesc':
    'Changes the computed astronomy. Defaults match published Indian panchangas.',
  'settings.ayanamsa': 'Ayanamsa',
  'settings.monthSystem': 'Month system',
  'settings.node': 'Rahu / Ketu',
  'settings.nodeHint': 'kundli only',
  'settings.display': 'Display',
  'settings.numerals': 'Numerals',
  // "Hindu" because both 1,2,3 and १,२,३ are Hindu-origin numerals;
  // the difference is just script. "Latin script" disambiguates the
  // international Hindu-Arabic form from the Devanagari form.
  'settings.numeralsLatin': 'Hindu, Latin script (1, 2, 3)',
  'settings.numeralsDevanagari': 'Hindu, Devanagari script (१, २, ३)',
  'settings.theme': 'Theme',
  'settings.themeAuto': 'Auto (match system)',
  'settings.themeLight': 'Light — saffron paper',
  'settings.themeDark': 'Dark — bronze ink',
  'settings.weekStart': 'Week starts on',
  'settings.weekSunday': 'Sunday',
  'settings.weekMonday': 'Monday',
  'settings.language': 'Language',
  'settings.langEnglish': 'English',
  'settings.langHindi': 'हिन्दी (Hindi)',
  'settings.dataPrivacy': 'Data & privacy',
  'settings.dataPrivacyDesc':
    'Everything lives in IndexedDB on this device only. Nothing leaves your browser. No analytics, no accounts.',
  'settings.clearCache': 'Clear computed cache',
  'settings.resetDefaults': 'Reset to defaults',
  'settings.resetConfirm': 'Reset all settings to defaults? Your current location will be kept.',
  'settings.cacheClearedAt': 'Cache cleared at {time}',
  'settings.resetAt': 'Settings reset at {time}',
  'settings.about': 'About',
  'settings.aboutMethod': 'Method',
  'settings.aboutEphemeris': 'Ephemeris',
  'settings.aboutLicense': 'License',
  'settings.aboutMethodology': "How it's calculated",
  'settings.aboutSource': 'Source code',
  'settings.methodologyLink': 'Methodology →',
  'settings.sourceLink': 'GitHub →',

  // ── ayanamsa options
  'ayanamsa.lahiri': 'Lahiri (Indian government standard)',
  'ayanamsa.trueChitra': 'True Chitra Paksha',
  'ayanamsa.raman': 'Raman',
  'ayanamsa.kp': 'KP (Krishnamurti)',
  'ayanamsa.yukteshwar': 'Yukteshwar',

  // ── month system options
  'monthSystem.amanta': 'Amanta (new-moon to new-moon — South India)',
  'monthSystem.purnimanta': 'Purnimanta (full-moon to full-moon — North India)',
  'node.mean': 'Mean node (smoothed)',
  'node.true': 'True node (osculating)',

  // ── footer
  'footer.method': 'Drik Ganita · Lahiri ayanamsa · Geocentric · Sunrise-anchored',
  'footer.privacy': 'Computed on your device — no data leaves it. Open source under',

  // ── month
  'month.invalid': 'Invalid month: {value}',
  'month.computing': 'Computing…',
  'month.invalidDate': 'Invalid date: {value}',
  'month.loading': 'Loading panchanga…',

  // ── miscellaneous
  'common.purnima': 'Purnima',
  'common.amavasya': 'Amavasya',
  'common.ekadashi': 'Ekadashi',
};

export type TranslationKey = keyof typeof en;
