// ---- Internationalization ----

var TRANSLATIONS = {
  en: {
    // Nav
    "nav.planning": "Planning",
    "nav.insights": "Insights",
    "nav.data": "Data",
    "nav.roadmap": "Roadmap",
    "nav.signin": "Sign in",
    "nav.signout": "Sign out",
    "nav.startPlan": "Start Plan",

    // Hero
    "hero.eyebrow": "AI-guided endurance training",
    "hero.title": "Plan smarter, adapt faster, and train with clarity.",
    "hero.subhead": "RunSmart blends evidence-informed coaching with real-life constraints so every training block feels achievable, personalized, and explainable.",
    "hero.generatePlan": "Generate a plan",
    "hero.sampleWeek": "View sample week",
    "hero.nextGoal": "Next Goal Race",
    "hero.trailInfo": "Trail 50K \u2022 18 weeks out",
    "hero.weeklyFocus": "Weekly focus",
    "hero.mileage": "Mileage",
    "hero.keyWorkout": "Key workout",
    "hero.readiness": "Readiness",
    "hero.onTrack": "On track",
    "hero.cardNote": "\u201cYou handled last week well. Keep the mid-week intensity controlled to stay fresh for the long run.\u201d",

    // Planning section
    "planning.title": "Training plan generator",
    "planning.desc": "Build goal-oriented blocks with progression guardrails, realistic scheduling, and transparent coaching rationale.",
    "planning.macroBlock": "Macro block builder",
    "planning.macroBlockDesc": "Base \u2192 Build \u2192 Peak \u2192 Taper sequencing tuned to your race distance and terrain.",
    "planning.weeklyStructure": "Weekly structure",
    "planning.weeklyStructureDesc": "Long runs, intensity, and recovery days aligned to your travel and workload constraints.",
    "planning.adjustments": "Explainable adjustments",
    "planning.adjustmentsDesc": "Every change is tied to fatigue, consistency, and execution feedback.",
    "planning.quickPlan": "Quick plan builder",
    "planning.goalRace": "Goal race",
    "planning.raceDate": "Race date",
    "planning.weeklyAvailability": "Weekly availability",
    "planning.currentMileage": "Current weekly mileage",
    "planning.constraints": "Key constraints",
    "planning.b2b": "Back-to-back long run weekends",
    "planning.createDraft": "Create draft plan",
    "planning.myPlans": "My plans",
    "planning.trainingBlocks": "Training blocks",

    // Gantt planner
    "gantt.title": "Training block planner",
    "gantt.subtitle": "Koop periodization \u2014 week-by-week breakdown",
    "gantt.week": "Wk",
    "gantt.date": "Date",
    "gantt.phase": "Phase",
    "gantt.volume": "Volume",
    "gantt.keySession": "Key session",
    "gantt.longRun": "Long run",
    "gantt.notes": "Notes",
    "gantt.recovery": "Recovery",
    "gantt.today": "NOW",
    "gantt.preparation": "Preparation",
    "gantt.endurance": "Endurance",
    "gantt.specificPrep": "Specific Prep",
    "gantt.taper": "Taper",
    "gantt.raceWeek": "Race Week",
    "gantt.prepDesc": "Build general aerobic fitness and running economy",
    "gantt.enduranceDesc": "Increase volume and introduce sustained efforts",
    "gantt.specificDesc": "Race-specific training with terrain simulation",
    "gantt.taperDesc": "Reduce volume, maintain sharpness",
    "gantt.recoveryWeek": "Recovery week",
    "gantt.steadyState": "SteadyState run",
    "gantt.muscleTension": "MuscleTension intervals",
    "gantt.tempo": "Tempo run",
    "gantt.enduranceRun": "EnduranceRun",
    "gantt.overUnder": "OverUnder intervals",
    "gantt.raceSimulation": "Race simulation",
    "gantt.easyVolume": "Easy volume build",
    "gantt.b2bLong": "B2B long weekend",
    "gantt.raceDay": "Race day!",

    // Insights section
    "insights.title": "Training analysis & insights",
    "insights.desc": "Understand readiness, spot risk early, and see the impact of your consistency.",
    "insights.trainingLoad": "Training load",
    "insights.acuteVsChronic": "Acute vs chronic balance",
    "insights.acuteDesc": "Visualize fatigue and form trends so you can confidently push or recover.",
    "insights.performance": "Performance",
    "insights.raceForecast": "Race readiness forecast",
    "insights.raceDesc": "Track long-run durability, vertical progression, and race-specific confidence signals.",
    "insights.risk": "Risk",
    "insights.overtraining": "Overtraining alerts",
    "insights.overtrainingDesc": "Detect sudden spikes and missed recovery before they derail the block.",
    "insights.loadTrend": "Training load trend",
    "insights.longRunProg": "Long run progression",
    "insights.latestCheckin": "Latest check-in",
    "insights.noCheckin": "No check-in yet. Submit your weekly check-in below to track readiness.",
    "insights.formTrend": "Form trend",
    "insights.readiness": "Readiness",
    "insights.riskScore": "Risk score",
    "insights.weeklyCheckin": "Weekly check-in",
    "insights.fatigue": "Fatigue",
    "insights.sleepQuality": "Sleep quality",
    "insights.motivation": "Motivation",
    "insights.niggles": "Any niggles or pain?",
    "insights.notes": "Notes",
    "insights.submitCheckin": "Submit check-in",

    // Data section
    "data.title": "Reliable data ingestion",
    "data.desc": "Sync Strava automatically, log workouts manually, and normalize everything for analytics.",
    "data.connectedSources": "Connected sources",
    "data.stravaSync": "Strava activity sync",
    "data.manualEntry": "Manual run + cross-training entry",
    "data.hrSupport": "Heart-rate & elevation support",
    "data.privacyStorage": "Privacy-first storage",
    "data.privacyDesc": "Supabase-backed, athlete-owned data with row-level security.",
    "data.reviewPolicy": "Review data policy",
    "data.strava": "Strava",
    "data.stravaConnect": "Connect your Strava account to import training data.",
    "data.connectStrava": "Connect Strava",
    "data.status": "Status",
    "data.connected": "Connected",
    "data.lastSync": "Last sync",
    "data.never": "Never",
    "data.syncNow": "Sync now",
    "data.disconnect": "Disconnect",
    "data.thisWeek": "This week",
    "data.recentWeeks": "Recent weeks",
    "data.logWorkout": "Log a workout",
    "data.activityName": "Activity name",
    "data.type": "Type",
    "data.distance": "Distance (mi)",
    "data.duration": "Duration (min)",
    "data.elevation": "Elevation (ft)",
    "data.date": "Date",
    "data.effort": "Effort (RPE)",
    "data.saveWorkout": "Save workout",
    "data.recentActivities": "Recent activities",

    // Activity types
    "type.Run": "Run",
    "type.Hike": "Hike",
    "type.Walk": "Walk",
    "type.Strength": "Strength",
    "type.Yoga": "Yoga",
    "type.Cross-training": "Cross-training",

    // Roadmap section
    "roadmap.title": "Roadmap for future expansion",
    "roadmap.desc": "Designed for single-athlete focus today, ready for collaborative coaching tomorrow.",
    "roadmap.now": "Now",
    "roadmap.nowDesc": "Personal training optimization with explainable AI guidance.",
    "roadmap.next": "Next",
    "roadmap.nextDesc": "Coach-athlete sharing, injury prediction, and recovery integrations.",
    "roadmap.later": "Later",
    "roadmap.laterDesc": "Nutrition insights, sleep data, and smarter route intelligence.",

    // Footer
    "footer.tagline": "Evidence-informed training guidance for endurance runners.",
    "footer.support": "Support",
    "footer.privacy": "Privacy",
    "footer.contact": "Contact",

    // Auth modal
    "auth.title": "Sign in to RunSmart",
    "auth.googleContinue": "Continue with Google",
    "auth.or": "or",
    "auth.emailSignin": "Email sign in",
    "auth.signup": "Sign up",
    "auth.email": "Email",
    "auth.password": "Password",
    "auth.signinBtn": "Sign in",
    "auth.createAccount": "Create account",

    // Dynamic strings
    "dynamic.weeksOut": "weeks out",
    "dynamic.currentBlock": "Current block",
    "dynamic.targetMileage": "Target mileage",
    "dynamic.deletePlan": "Delete this plan?",
    "dynamic.weekOf": "Week of",
    "dynamic.distance": "Distance",
    "dynamic.elevation": "Elevation",
    "dynamic.timeOnFeet": "Time on feet",
    "dynamic.activities": "Activities",
    "dynamic.runs": "Runs",
    "dynamic.time": "Time",
    "dynamic.pace": "Pace",
    "dynamic.noPlans": "No plans yet. Use the form above to create your first plan.",
    "dynamic.noActivities": "No activities synced yet. Click \u201cSync now\u201d to import from Strava.",
    "dynamic.raceDate": "Race date",
    "dynamic.daysWeek": "Days/week",
    "dynamic.miWk": "mi/wk",
    "dynamic.created": "Created",
    "dynamic.weeks": "weeks",
    "dynamic.wk": "wk",
    "dynamic.fresh": "Fresh",
    "dynamic.neutral": "Neutral",
    "dynamic.fatigued": "Fatigued",
    "dynamic.high": "High",
    "dynamic.moderate": "Moderate",
    "dynamic.low": "Low",

    // Placeholders
    "ph.goalRace": "Trail 50K",
    "ph.constraints": "Work travel in week 6, prefer long runs on Sundays",
    "ph.niggles": "e.g. left achilles tightness",
    "ph.notes": "How was your week?",
    "ph.activityName": "Morning trail run",

    // Language
    "lang.en": "English",
    "lang.no": "Norsk",
  },

  no: {
    // Nav
    "nav.planning": "Planlegging",
    "nav.insights": "Innsikt",
    "nav.data": "Data",
    "nav.roadmap": "Veikart",
    "nav.signin": "Logg inn",
    "nav.signout": "Logg ut",
    "nav.startPlan": "Start plan",

    // Hero
    "hero.eyebrow": "AI-veiledet utholdenhetstrening",
    "hero.title": "Planlegg smartere, tilpass raskere, og tren med klarhet.",
    "hero.subhead": "RunSmart kombinerer evidensbasert coaching med hverdagens begrensninger, slik at hver treningsblokk f\u00f8les oppn\u00e5elig, personlig og forklarlig.",
    "hero.generatePlan": "Lag en plan",
    "hero.sampleWeek": "Se eksempeluke",
    "hero.nextGoal": "Neste m\u00e5ll\u00f8p",
    "hero.trailInfo": "Trail 50K \u2022 18 uker igjen",
    "hero.weeklyFocus": "Ukefokus",
    "hero.mileage": "Kilometerstand",
    "hero.keyWorkout": "N\u00f8kkel\u00f8kt",
    "hero.readiness": "Beredskap",
    "hero.onTrack": "P\u00e5 sporet",
    "hero.cardNote": "\u00abDu h\u00e5ndterte forrige uke bra. Hold intensiteten midt i uken kontrollert for \u00e5 v\u00e6re frisk til langturen.\u00bb",

    // Planning section
    "planning.title": "Treningsplangenerator",
    "planning.desc": "Bygg m\u00e5lrettede blokker med progresjonsrammer, realistisk planlegging og transparent coaching-begrunnelse.",
    "planning.macroBlock": "Makroblokkbygger",
    "planning.macroBlockDesc": "Base \u2192 Bygg \u2192 Topp \u2192 Nedtrapping tilpasset l\u00f8psdistanse og terreng.",
    "planning.weeklyStructure": "Ukestruktur",
    "planning.weeklyStructureDesc": "Langturer, intensitet og restitusjonsdager tilpasset reise- og arbeidsbelastning.",
    "planning.adjustments": "Forklarbare justeringer",
    "planning.adjustmentsDesc": "Hver endring er knyttet til tretthet, konsistens og utf\u00f8relsesfeedback.",
    "planning.quickPlan": "Rask planbygger",
    "planning.goalRace": "M\u00e5ll\u00f8p",
    "planning.raceDate": "L\u00f8psdato",
    "planning.weeklyAvailability": "Ukentlig tilgjengelighet",
    "planning.currentMileage": "N\u00e5v\u00e6rende ukentlig kilometerstand",
    "planning.constraints": "N\u00f8kkelbegrensninger",
    "planning.b2b": "Rygg-mot-rygg langtur-helger",
    "planning.createDraft": "Lag planutkast",
    "planning.myPlans": "Mine planer",
    "planning.trainingBlocks": "Treningsblokker",

    // Gantt planner
    "gantt.title": "Treningsblokkplanlegger",
    "gantt.subtitle": "Koop-periodisering \u2014 uke-for-uke-oversikt",
    "gantt.week": "Uke",
    "gantt.date": "Dato",
    "gantt.phase": "Fase",
    "gantt.volume": "Volum",
    "gantt.keySession": "N\u00f8kkel\u00f8kt",
    "gantt.longRun": "Langtur",
    "gantt.notes": "Notater",
    "gantt.recovery": "Restitusjon",
    "gantt.today": "N\u00c5",
    "gantt.preparation": "Forberedelse",
    "gantt.endurance": "Utholdenhet",
    "gantt.specificPrep": "Spesifikk forb.",
    "gantt.taper": "Nedtrapping",
    "gantt.raceWeek": "L\u00f8psuke",
    "gantt.prepDesc": "Bygg generell aerob form og l\u00f8ps\u00f8konomi",
    "gantt.enduranceDesc": "\u00d8k volum og introduser vedvarende innsats",
    "gantt.specificDesc": "L\u00f8psspesifikk trening med terrengsimulering",
    "gantt.taperDesc": "Reduser volum, behold skarphet",
    "gantt.recoveryWeek": "Restitusjonsuke",
    "gantt.steadyState": "SteadyState-l\u00f8p",
    "gantt.muscleTension": "MuscleTension-intervaller",
    "gantt.tempo": "Tempol\u00f8p",
    "gantt.enduranceRun": "Utholdenhetstur",
    "gantt.overUnder": "OverUnder-intervaller",
    "gantt.raceSimulation": "L\u00f8pssimulering",
    "gantt.easyVolume": "Lett volumbygging",
    "gantt.b2bLong": "Rygg-mot-rygg langtur",
    "gantt.raceDay": "L\u00f8psdag!",

    // Insights section
    "insights.title": "Treningsanalyse og innsikt",
    "insights.desc": "Forst\u00e5 beredskap, oppdage risiko tidlig, og se effekten av konsistensen din.",
    "insights.trainingLoad": "Treningsbelastning",
    "insights.acuteVsChronic": "Akutt vs kronisk balanse",
    "insights.acuteDesc": "Visualiser tretthet- og formtrender s\u00e5 du trygt kan presse eller restituere.",
    "insights.performance": "Prestasjon",
    "insights.raceForecast": "L\u00f8psberedskap",
    "insights.raceDesc": "Spor langtur-utholdenhet, vertikal progresjon og l\u00f8psspesifikke tillit-signaler.",
    "insights.risk": "Risiko",
    "insights.overtraining": "Overtreningsvarsler",
    "insights.overtrainingDesc": "Oppdage plutselige \u00f8kninger og manglende restitusjon f\u00f8r de avsporer blokken.",
    "insights.loadTrend": "Treningsbelastningstrend",
    "insights.longRunProg": "Langturprogresjon",
    "insights.latestCheckin": "Siste innsjekk",
    "insights.noCheckin": "Ingen innsjekk enn\u00e5. Send inn din ukentlige innsjekk for \u00e5 spore beredskap.",
    "insights.formTrend": "Formtrend",
    "insights.readiness": "Beredskap",
    "insights.riskScore": "Risikoscore",
    "insights.weeklyCheckin": "Ukentlig innsjekk",
    "insights.fatigue": "Tretthet",
    "insights.sleepQuality": "S\u00f8vnkvalitet",
    "insights.motivation": "Motivasjon",
    "insights.niggles": "Sm\u00e5plager eller smerter?",
    "insights.notes": "Notater",
    "insights.submitCheckin": "Send innsjekk",

    // Data section
    "data.title": "P\u00e5litelig datainnhenting",
    "data.desc": "Synkroniser Strava automatisk, logg treninger manuelt, og normaliser alt for analyse.",
    "data.connectedSources": "Tilkoblede kilder",
    "data.stravaSync": "Strava-aktivitetssynkronisering",
    "data.manualEntry": "Manuell l\u00f8pe- og krysstrening",
    "data.hrSupport": "Puls- og h\u00f8ydest\u00f8tte",
    "data.privacyStorage": "Personvernf\u00f8rst lagring",
    "data.privacyDesc": "Supabase-st\u00f8ttet, ut\u00f8vereid data med radniv\u00e5-sikkerhet.",
    "data.reviewPolicy": "Se personvernpolicy",
    "data.strava": "Strava",
    "data.stravaConnect": "Koble til Strava-kontoen din for \u00e5 importere treningsdata.",
    "data.connectStrava": "Koble til Strava",
    "data.status": "Status",
    "data.connected": "Tilkoblet",
    "data.lastSync": "Siste synk",
    "data.never": "Aldri",
    "data.syncNow": "Synk n\u00e5",
    "data.disconnect": "Koble fra",
    "data.thisWeek": "Denne uken",
    "data.recentWeeks": "Siste uker",
    "data.logWorkout": "Logg en trening",
    "data.activityName": "Aktivitetsnavn",
    "data.type": "Type",
    "data.distance": "Distanse (mi)",
    "data.duration": "Varighet (min)",
    "data.elevation": "H\u00f8ydemeter (ft)",
    "data.date": "Dato",
    "data.effort": "Anstrengelse (RPE)",
    "data.saveWorkout": "Lagre trening",
    "data.recentActivities": "Siste aktiviteter",

    // Activity types
    "type.Run": "L\u00f8ping",
    "type.Hike": "Fjelltur",
    "type.Walk": "G\u00e5tur",
    "type.Strength": "Styrke",
    "type.Yoga": "Yoga",
    "type.Cross-training": "Krysstrening",

    // Roadmap section
    "roadmap.title": "Veikart for fremtidig utvikling",
    "roadmap.desc": "Designet for enkeltut\u00f8ver-fokus i dag, klar for samarbeids-coaching i morgen.",
    "roadmap.now": "N\u00e5",
    "roadmap.nowDesc": "Personlig treningsoptimalisering med forklarbar AI-veiledning.",
    "roadmap.next": "Neste",
    "roadmap.nextDesc": "Trener-ut\u00f8ver-deling, skadeprediksjon og restitusjonsintegrasjoner.",
    "roadmap.later": "Senere",
    "roadmap.laterDesc": "Ern\u00e6ringsinnsikt, s\u00f8vndata og smartere ruteintelligens.",

    // Footer
    "footer.tagline": "Evidensbasert treningsveiledning for utholdenhets\u00f8pere.",
    "footer.support": "St\u00f8tte",
    "footer.privacy": "Personvern",
    "footer.contact": "Kontakt",

    // Auth modal
    "auth.title": "Logg inn p\u00e5 RunSmart",
    "auth.googleContinue": "Fortsett med Google",
    "auth.or": "eller",
    "auth.emailSignin": "E-post innlogging",
    "auth.signup": "Registrer",
    "auth.email": "E-post",
    "auth.password": "Passord",
    "auth.signinBtn": "Logg inn",
    "auth.createAccount": "Opprett konto",

    // Dynamic strings
    "dynamic.weeksOut": "uker igjen",
    "dynamic.currentBlock": "N\u00e5v\u00e6rende blokk",
    "dynamic.targetMileage": "M\u00e5l-kilometerstand",
    "dynamic.deletePlan": "Slette denne planen?",
    "dynamic.weekOf": "Uke av",
    "dynamic.distance": "Distanse",
    "dynamic.elevation": "H\u00f8ydemeter",
    "dynamic.timeOnFeet": "Tid p\u00e5 beina",
    "dynamic.activities": "Aktiviteter",
    "dynamic.runs": "L\u00f8peturer",
    "dynamic.time": "Tid",
    "dynamic.pace": "Tempo",
    "dynamic.noPlans": "Ingen planer enn\u00e5. Bruk skjemaet ovenfor for \u00e5 lage din f\u00f8rste plan.",
    "dynamic.noActivities": "Ingen aktiviteter synkronisert enn\u00e5. Klikk \u00abSynk n\u00e5\u00bb for \u00e5 importere fra Strava.",
    "dynamic.raceDate": "L\u00f8psdato",
    "dynamic.daysWeek": "Dager/uke",
    "dynamic.miWk": "mi/uke",
    "dynamic.created": "Opprettet",
    "dynamic.weeks": "uker",
    "dynamic.wk": "uke",
    "dynamic.fresh": "Frisk",
    "dynamic.neutral": "N\u00f8ytral",
    "dynamic.fatigued": "Sliten",
    "dynamic.high": "H\u00f8y",
    "dynamic.moderate": "Moderat",
    "dynamic.low": "Lav",

    // Placeholders
    "ph.goalRace": "Trail 50K",
    "ph.constraints": "Jobbreise i uke 6, foretrekker langturer p\u00e5 s\u00f8ndager",
    "ph.niggles": "f.eks. stramhet i venstre akillessene",
    "ph.notes": "Hvordan var uken din?",
    "ph.activityName": "Morgen stil\u00f8p",

    // Language
    "lang.en": "English",
    "lang.no": "Norsk",
  },
};

var currentLang = localStorage.getItem("runsmart-lang") || "en";

function t(key) {
  var dict = TRANSLATIONS[currentLang] || TRANSLATIONS.en;
  return dict[key] || TRANSLATIONS.en[key] || key;
}

function setLanguage(lang) {
  currentLang = lang;
  localStorage.setItem("runsmart-lang", lang);
  document.documentElement.lang = lang;
  applyTranslations();
}

function applyTranslations() {
  document.querySelectorAll("[data-i18n]").forEach(function (el) {
    var key = el.getAttribute("data-i18n");
    var translated = t(key);
    var attr = el.getAttribute("data-i18n-attr");
    if (attr === "placeholder") {
      el.placeholder = translated;
    } else if (attr === "aria-label") {
      el.setAttribute("aria-label", attr);
    } else {
      el.textContent = translated;
    }
  });

  // Update language switcher active state
  document.querySelectorAll(".lang-option").forEach(function (btn) {
    btn.classList.toggle("active", btn.dataset.lang === currentLang);
  });
}
