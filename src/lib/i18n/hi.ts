// Hindi (हिन्दी) translations. Keys must match en.ts exactly.
//
// Style: prefer Sanskrit-origin / native Hindi words over English-loan
// transliterations (विन्यास, not सेटिंग्स; नगर, not शहर; मूल विन्यास,
// not डिफ़ॉल्ट; संग्रह, not कैश). Festival and panchanga names use
// canonical Devanagari forms from the names-hi.ts arrays.

import type { TranslationKey } from './en';

export const hi: Record<TranslationKey, string> = {
  // ── tabs / nav
  'tab.day': 'दिन',
  'tab.month': 'मास',
  'tab.festivals': 'त्योहार',
  'tab.kundli': 'कुण्डली',
  'tab.sky': 'आकाश',
  'update.available': 'नया संस्करण उपलब्ध है।',
  'update.reload': 'पुनः लोड करें',
  'update.dismiss': 'खारिज करें',
  'nav.back': 'वापस',
  'nav.skipToContent': 'सामग्री पर जाएं',
  'nav.openSettings': 'विन्यास खोलें',
  'nav.location': 'स्थान बदलें',
  'nav.switchLanguage': 'Switch to English',
  'nav.prevMonth': 'विगत मास',
  'nav.nextMonth': 'आगामी मास',
  'nav.prevYear': 'विगत वर्ष',
  'nav.nextYear': 'आगामी वर्ष',
  'nav.previousDay': 'विगत दिन',
  'nav.nextDay': 'आगामी दिन',

  // ── masthead
  // The main display title uses the proper Sanskrit form पञ्चाङ्ग
  // (with the half-form ङ्ग conjunct) rather than the colloquial
  // Hindi simplification पंचांग — the calendar leans literary.
  'masthead.title': 'पञ्चाङ्ग',
  // Cross-language kicker — see en.ts. In Hindi mode the masthead
  // kicker shows the Latin name as a small ornament.
  'masthead.kicker': 'Panchanga',
  'masthead.vikram': 'विक्रम सम्वत',
  'masthead.shaka': 'शक सम्वत',

  // ── day card / hero
  'paksha.shukla': 'शुक्ल पक्ष',
  'paksha.krishna': 'कृष्ण पक्ष',
  'masa.adhika': 'अधिक',
  'masa.kshaya': 'क्षय',
  'system.purnimanta': 'पूर्णिमान्त',
  'system.amanta': 'अमान्त',
  // Hindi: "{time} तक · फिर {next}" — the तक particle goes AFTER the
  // time, so endsBefore is empty and endsAfter carries ' तक'.
  'tithi.endsBefore': '',
  'tithi.endsAfter': ' तक',
  'tithi.then': 'फिर',
  'tithi.upto': 'तक',
  'tithi.allDay': 'पूरे दिन',
  'moon.lit': '{percent}% प्रकाशित',

  // ── moon phases
  // The Shukla side uses वर्धमान (waxing/growing); its opposite on the
  // Krishna side is ह्रासमान (waning/decreasing) — not बाल (young),
  // which only fits a young/early-stage moon. Waning crescent at the
  // end of the cycle gets क्षीण (thin/diminished).
  'moonPhase.new': 'अमावस्या',
  'moonPhase.waxingCrescent': 'शुक्ल बाल चन्द्र',
  'moonPhase.firstQuarter': 'शुक्ल अष्टमी चन्द्र',
  'moonPhase.waxingGibbous': 'शुक्ल वर्धमान चन्द्र',
  'moonPhase.full': 'पूर्णिमा',
  'moonPhase.waningGibbous': 'कृष्ण ह्रासमान चन्द्र',
  'moonPhase.lastQuarter': 'कृष्ण अष्टमी चन्द्र',
  'moonPhase.waningCrescent': 'कृष्ण क्षीण चन्द्र',

  // ── timings strip
  'timing.sunrise': 'सूर्योदय',
  'timing.sunset': 'सूर्यास्त',
  'timing.moonrise': 'चन्द्रोदय',
  'timing.moonset': 'चन्द्रास्त',

  // ── anga table
  'anga.tithi': 'तिथि',
  'anga.nakshatra': 'नक्षत्र',
  'anga.yoga': 'योग',
  'anga.karana': 'करण',
  'anga.vara': 'वार',
  // Pada (quarter of a nakshatra) is पद in Hindi, not पाद.
  'anga.pada': 'पद',

  // ── section headings
  'section.panchanga': 'पंचांग',
  'section.muhurta': 'मुहूर्त',
  // "Year" was the literal English; user prefers the Sanskrit-Hindi
  // "सम्वत" (era/year-count) here with Latin "year" as the kicker.
  'section.year': 'सम्वत',
  // Section kickers carry the Latin transliteration in Hindi mode.
  'kicker.panchanga': 'Panchanga',
  'kicker.muhurta': 'Muhurta',
  'kicker.year': 'year',
  'kicker.location': 'Location',
  'kicker.calculation': 'Calculation',
  'kicker.display': 'Display',
  'kicker.dataPrivacy': 'Privacy',
  'kicker.about': 'About',

  // ── muhurta
  'muhurta.rahuKaal': 'राहु काल',
  'muhurta.yamaganda': 'यमगण्ड',
  'muhurta.gulika': 'गुलिक काल',
  'muhurta.abhijit': 'अभिजित मुहूर्त',
  'muhurta.brahmaMuhurta': 'ब्रह्म मुहूर्त',
  'muhurta.pratahSandhya': 'प्रातः सन्ध्या',
  'muhurta.vijayaMuhurta': 'विजय मुहूर्त',
  'muhurta.godhuli': 'गोधूलि मुहूर्त',
  'muhurta.sayahnaSandhya': 'सायं सन्ध्या',
  'muhurta.nishitaKaal': 'निशीथ काल',
  'muhurta.inauspicious': 'अशुभ',
  'muhurta.auspicious': 'शुभ',
  'muhurta.preDawn': 'प्रातः पूर्व',
  'muhurta.twilight': 'सन्ध्या',
  'muhurta.afternoon': 'अपराह्न',
  'muhurta.sunset': 'सूर्यास्त के समय',
  'muhurta.night': 'मध्य रात्रि',

  // ── year card
  'year.vikrama': 'विक्रम',
  'year.shaka': 'शक',
  'year.kali': 'कलियुग',
  'year.ritu': 'ऋतु',
  'year.ayana': 'अयन',
  'year.uttarayana': 'उत्तरायण',
  'year.dakshinayana': 'दक्षिणायन',
  'year.suryaRashi': 'सूर्य राशि',
  'year.chandraRashi': 'चन्द्र राशि',
  'year.sankranti': 'संक्रान्ति',

  // ── ritus
  'ritu.vasanta': 'वसन्त',
  'ritu.grishma': 'ग्रीष्म',
  'ritu.varsha': 'वर्षा',
  'ritu.sharad': 'शरद',
  'ritu.hemanta': 'हेमन्त',
  'ritu.shishira': 'शिशिर',

  // ── varas (Sanskrit-Hindi shared)
  'vara.sunday': 'रविवार',
  'vara.monday': 'सोमवार',
  'vara.tuesday': 'मंगलवार',
  'vara.wednesday': 'बुधवार',
  'vara.thursday': 'गुरुवार',
  'vara.friday': 'शुक्रवार',
  'vara.saturday': 'शनिवार',

  // ── short weekday for grid
  'wd.sun': 'रवि',
  'wd.mon': 'सोम',
  'wd.tue': 'मंगल',
  'wd.wed': 'बुध',
  'wd.thu': 'गुरु',
  'wd.fri': 'शुक्र',
  'wd.sat': 'शनि',

  // ── festivals
  'fest.todayLabel': 'आज का त्योहार',
  'fest.todayLabelMulti': 'आज',
  'fest.festivalsYear': 'त्योहार · {year}',
  'fest.today': 'आज',
  'fest.inDays': '{days} दिन में',
  'fest.inOneDay': '{days} दिन में',
  // पूर्व ("before/past") reads more naturally than the colloquial पहले
  // in a calendar context, and matches the literary register used
  // elsewhere (विगत/आगामी).
  'fest.daysAgo': '{days} दिन पूर्व',
  'fest.oneDayAgo': '{days} दिन पूर्व',
  'fest.computing': 'वर्ष के त्योहारों की गणना हो रही है…',
  'fest.invalidYear': 'अमान्य वर्ष: {year}',

  // ── month / festival legend
  'legend.shuklaPaksha': 'शुक्ल पक्ष',
  'legend.krishnaPaksha': 'कृष्ण पक्ष',
  'legend.festival': 'त्योहार',

  // ── day-pager
  'pager.jumpToToday': 'आज पर जाएं',
  'pager.pickDate': 'तारीख पर जाएं',

  // ── settings cards
  'settings.title': 'विन्यास',
  'settings.location': 'स्थान',
  'settings.locationDesc': 'सारी गणनाएँ इस स्थान के सूर्योदय पर आधारित हैं।',
  'settings.search': 'खोजें',
  'settings.searchCity': 'नगर खोजें…',
  'settings.useMyLocation': 'मेरा स्थान उपयोग करें',
  'settings.locating': 'खोज रहे हैं…',
  'settings.currentLocation': 'वर्तमान:',
  'settings.noLocation': 'कोई स्थान चयनित नहीं — नगर खोजें या अपना स्थान उपयोग करें।',
  'settings.calculation': 'गणना',
  'settings.calculationDesc':
    'खगोलीय गणना के विकल्प। मूल विन्यास प्रकाशित भारतीय पंचांगों से मेल खाते हैं।',
  'settings.ayanamsa': 'अयनांश',
  'settings.monthSystem': 'मास पद्धति',
  'settings.node': 'राहु / केतु',
  'settings.nodeHint': 'केवल कुण्डली',
  'settings.display': 'प्रदर्शन',
  'settings.numerals': 'अंक',
  'settings.numeralsLatin': 'हिन्दू, लैटिन लिपि (1, 2, 3)',
  'settings.numeralsDevanagari': 'हिन्दू, देवनागरी लिपि (१, २, ३)',
  'settings.theme': 'पृष्ठभूमि',
  'settings.themeAuto': 'स्वतः (सिस्टम के अनुसार)',
  'settings.themeLight': 'दिन — केसरिया कागज़',
  'settings.themeDark': 'रात — काँसा स्याही',
  'settings.weekStart': 'सप्ताह शुरू',
  'settings.weekSunday': 'रविवार',
  'settings.weekMonday': 'सोमवार',
  'settings.language': 'भाषा',
  'settings.langEnglish': 'English',
  'settings.langHindi': 'हिन्दी',
  'settings.dataPrivacy': 'डेटा एवं गोपनीयता',
  'settings.dataPrivacyDesc':
    'सब कुछ इस उपकरण के संग्रह में रहता है। कुछ भी ब्राउज़र से बाहर नहीं जाता। कोई एनालिटिक्स नहीं, कोई खाता नहीं।',
  'settings.clearCache': 'गणित संग्रह साफ़ करें',
  'settings.resetDefaults': 'मूल विन्यास पर लौटाएं',
  'settings.resetConfirm': 'सभी विन्यास मूल पर लौटाएं? आपका वर्तमान स्थान रहेगा।',
  'settings.cacheClearedAt': 'संग्रह {time} पर साफ़ किया गया',
  'settings.resetAt': 'विन्यास {time} पर मूल पर लौटाया गया',
  'settings.about': 'परिचय',
  'settings.aboutMethod': 'विधि',
  'settings.aboutEphemeris': 'खगोल गणित',
  'settings.aboutLicense': 'अनुज्ञप्ति',
  'settings.aboutMethodology': 'गणना कैसे होती है',
  'settings.aboutSource': 'स्रोत संहिता',
  'settings.methodologyLink': 'विधि पढ़ें →',
  'settings.sourceLink': 'GitHub →',

  // ── ayanamsa options
  'ayanamsa.lahiri': 'लाहिरी (भारत सरकार मानक)',
  'ayanamsa.trueChitra': 'चित्रापक्ष',
  'ayanamsa.raman': 'रमण',
  'ayanamsa.kp': 'के.पी. (कृष्णमूर्ति)',
  'ayanamsa.yukteshwar': 'युक्तेश्वर',

  // ── month system options
  'node.mean': 'मध्य (औसत) नोड',
  'node.true': 'स्पष्ट (वास्तविक) नोड',
  'monthSystem.amanta': 'अमान्त (अमावस्या से अमावस्या — दक्षिण भारत)',
  'monthSystem.purnimanta': 'पूर्णिमान्त (पूर्णिमा से पूर्णिमा — उत्तर भारत)',

  // ── footer
  'footer.method': 'दृक गणित · लाहिरी अयनांश · भूकेन्द्रित · सूर्योदय आधारित',
  'footer.privacy': 'सब कुछ आपके उपकरण पर — कोई डेटा बाहर नहीं जाता। मुक्त स्रोत, अनुज्ञप्ति',

  // ── month
  'month.invalid': 'अमान्य मास: {value}',
  'month.computing': 'गणना हो रही है…',
  'month.invalidDate': 'अमान्य दिनांक: {value}',
  'month.loading': 'पंचांग लोड हो रहा है…',

  // ── miscellaneous
  'common.purnima': 'पूर्णिमा',
  'common.amavasya': 'अमावस्या',
  'common.ekadashi': 'एकादशी',
};
