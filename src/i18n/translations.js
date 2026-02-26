// ---- Internationalization ----
import { useSyncExternalStore } from "react";

export const TRANSLATIONS = {
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
    "planning.currentMileage": "Current weekly volume (km)",
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
    "data.distance": "Distance (km)",
    "data.duration": "Duration (min)",
    "data.elevation": "Elevation (m)",
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
    "dynamic.miWk": "km/wk",
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
    "ph.workoutName": "e.g. Easy run",
    "ph.dayNotes": "Optional notes for this day",

    // Sidebar
    "sidebar.dashboard": "Dashboard",
    "sidebar.planning": "Planning",
    "sidebar.insights": "Insights",
    "sidebar.data": "Data",
    "sidebar.coach": "Coach",
    "sidebar.roadmap": "Roadmap",

    // AI Coach
    "coach.title": "AI Coach",
    "coach.subtitle": "Personalized coaching insights based on your training data",
    "coach.noData": "Connect Strava or log workouts to receive coaching insights.",
    "coach.overtrainingRisk": "Overtraining risk detected",
    "coach.overtrainingRiskDesc": "Your acute load is significantly higher than your chronic load. Consider reducing volume this week to avoid injury.",
    "coach.highLoadRatio": "Training load climbing fast",
    "coach.highLoadRatioDesc": "Your fatigue is building faster than your fitness. Monitor recovery closely and consider an easy day.",
    "coach.wellRested": "Well rested and ready",
    "coach.wellRestedDesc": "Your form is positive \u2014 you have a surplus of fitness over fatigue. Great time for a quality session or race effort.",
    "coach.deepFatigue": "Deep fatigue accumulation",
    "coach.deepFatigueDesc": "Your training stress balance is very negative. Prioritize sleep, nutrition, and easy running for the next few days.",
    "coach.balancedLoad": "Training load balanced",
    "coach.balancedLoadDesc": "Your acute and chronic loads are well matched. You\u2019re in a sustainable training rhythm.",
    "coach.fitnessGrowing": "Fitness is building",
    "coach.fitnessGrowingDesc": "Your chronic training load has increased over the last 4 weeks. The consistency is paying off.",
    "coach.fitnessDeclining": "Fitness trending down",
    "coach.fitnessDecliningDesc": "Your chronic load has dropped over the past 4 weeks. Try to maintain consistent training to preserve your fitness base.",
    "coach.volumeSpike": "Volume spike this week",
    "coach.volumeSpikeDesc": "Your distance this week is 15%+ above last week. Sudden jumps increase injury risk \u2014 ensure adequate recovery.",
    "coach.longRunProgressing": "Long runs progressing well",
    "coach.longRunProgressingDesc": "Your last 3 long runs show a healthy upward trend in distance. Keep building gradually.",
    "coach.needsRest": "Rest day recommended",
    "coach.needsRestDesc": "High fatigue combined with poor sleep quality signals your body needs recovery. Take an easy day or full rest.",
    "coach.elevatedFatigue": "Fatigue is elevated",
    "coach.elevatedFatigueDesc": "Your check-in shows high fatigue. Consider reducing intensity today and focusing on recovery.",
    "coach.highMotivation": "Motivation is strong",
    "coach.highMotivationDesc": "Great mindset! Channel this energy into a quality session while staying within your plan structure.",
    "coach.niggleAlert": "Niggle alert",
    "coach.niggleAlertDesc": "You reported a niggle in your last check-in. Monitor closely and reduce load if it worsens.",
    "coach.raceWeekApproaching": "Race week is here",
    "coach.raceWeekApproachingDesc": "Your race is within 2 weeks. Focus on rest, nutrition, and mental preparation. Trust your training.",
    "coach.taperPhase": "Taper time",
    "coach.taperPhaseDesc": "Your race is 3\u20134 weeks away. Start reducing volume while maintaining some intensity to stay sharp.",
    "coach.getStarted": "Get started",
    "coach.getStartedDesc": "Sync your Strava account or log a workout to start receiving personalized coaching insights.",
    "coach.getAIInsights": "Get AI coaching insights",
    "coach.aiLoading": "Analyzing your training\u2026",
    "coach.aiError": "AI coaching unavailable. Showing rule-based insights.",
    "coach.aiBadge": "AI",
    "coach.ruleBasedSection": "Training analysis",
    "coach.aiSection": "AI coaching",

    // Weekly calendar
    "cal.title": "Weekly training calendar",
    "cal.easy": "Easy",
    "cal.recovery": "Recovery",
    "cal.intensity": "Intensity",
    "cal.long": "Long run",
    "cal.mediumLong": "Med-long",
    "cal.rest": "Rest",
    "cal.race": "Race",
    "cal.easyRun": "Easy run",
    "cal.recoveryRun": "Recovery run",
    "cal.longRun": "Long run",
    "cal.shakeout": "Shakeout",
    "cal.raceDay": "Race day",
    "cal.totalVolume": "total volume",
    "cal.longRunLabel": "long run",
    "cal.currentWeek": "Current week",
    "cal.editTitle": "Edit workout",
    "cal.editType": "Workout type",
    "cal.editName": "Workout name",
    "cal.editDistance": "Distance (km)",
    "cal.editNotes": "Notes",
    "cal.editSave": "Save",
    "cal.editReset": "Reset to plan",
    "cal.editSaving": "Saving\u2026",
    "cal.editSaved": "Saved!",

    // Intensity
    "intensity.z1": "Z1 - Recovery",
    "intensity.z2": "Z2 - Easy / Aerobic",
    "intensity.z3": "Z3 - Tempo",
    "intensity.z4": "Z4 - Threshold",
    "intensity.z5": "Z5 - VO2max",
    "intensity.race": "Race effort",
    "cal.editIntensity": "Intensity",
    "cal.editDescription": "Workout description",
    "cal.weeklyIntensity": "Weekly intensity",
    "ph.workoutDesc": "e.g. 3km warm-up, 4x1km at tempo pace with 90s jog recovery, 2km cool-down",

    // Language
    "lang.en": "English",
    "lang.no": "Norsk",

    // App shell navigation groups
    "nav.general": "General",
    "nav.other": "Other",
    "nav.trainingPlan": "Training Plan",
    "nav.weeklyPlan": "Weekly Plan",
    "nav.dailyLog": "Daily Log",
    "nav.pages": "Pages",
    "nav.search": "Search",

    // Coach page — new conversational UI
    "coach.aiCoachSubtitle": "Your AI running coach",
    "coach.showConversations": "Conversations",
    "coach.hide": "Hide",
    "coach.newConversation": "+ New conversation",
    "coach.noConversations": "No conversations yet.",
    "coach.deleteConv": "Delete this conversation?",
    "coach.delete": "Delete",
    "coach.cancel": "Cancel",
    "coach.emptyState": "Select a conversation or click + New conversation to get started.",
    "coach.clickRefresh": "Click Refresh coaching to get AI-powered insights based on your training data.",
    "coach.refreshCoaching": "Refresh coaching",
    "coach.analyzingBtn": "Analyzing\u2026",
    "coach.analyzingMsg": "Analyzing your training data with Gemini AI\u2026",
    "coach.followupPlaceholder": "Ask a follow-up question\u2026",
    "coach.send": "Send",
    "coach.dismiss": "Dismiss",
    "coach.trainingDataAnalyzed": "Training data analyzed",
    "coach.noPlan": "No training plan found.",
    "coach.createPlanFirst": "Create a training plan first for personalized coaching.",
    "coach.goalRace": "Goal Race",
    "coach.currentPhase": "Current Phase",
    "coach.week": "Week",
    "coach.targetVolume": "Target Volume",
    "coach.daysToRace": "days to race",
    "coach.last7Days": "Last 7 days",
    "coach.mood": "Mood",
    "coach.aboutYou": "About you",
    "coach.profileDescPre": "Sent to the AI coach. Your goal is set on the",
    "coach.profileDescPost": "page.",
    "coach.runningBackground": "Running background",
    "coach.bgPlaceholder": "e.g. Running for 3 years, mostly trails",
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
    "planning.currentMileage": "N\u00e5v\u00e6rende ukentlig volum (km)",
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
    "data.distance": "Distanse (km)",
    "data.duration": "Varighet (min)",
    "data.elevation": "H\u00f8ydemeter (m)",
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
    "dynamic.miWk": "km/uke",
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
    "ph.workoutName": "f.eks. Rolig l\u00f8p",
    "ph.dayNotes": "Valgfrie notater for denne dagen",

    // Sidebar
    "sidebar.dashboard": "Dashbord",
    "sidebar.planning": "Planlegging",
    "sidebar.insights": "Innsikt",
    "sidebar.data": "Data",
    "sidebar.coach": "Trener",
    "sidebar.roadmap": "Veikart",

    // AI Coach
    "coach.title": "AI-trener",
    "coach.subtitle": "Personlige treningsinnsikter basert p\u00e5 dine treningsdata",
    "coach.noData": "Koble til Strava eller logg treninger for \u00e5 motta treningsinnsikter.",
    "coach.overtrainingRisk": "Overtreningsrisiko oppdaget",
    "coach.overtrainingRiskDesc": "Din akutte belastning er betydelig h\u00f8yere enn din kroniske belastning. Vurder \u00e5 redusere volum denne uken for \u00e5 unng\u00e5 skade.",
    "coach.highLoadRatio": "Treningsbelastningen stiger raskt",
    "coach.highLoadRatioDesc": "Trettheten din bygger seg opp raskere enn formen. Overv\u00e5k restitusjon n\u00f8ye og vurder en rolig dag.",
    "coach.wellRested": "Godt restituert og klar",
    "coach.wellRestedDesc": "Formen din er positiv \u2014 du har et overskudd av form over tretthet. Bra tidspunkt for en kvalitets\u00f8kt.",
    "coach.deepFatigue": "Dyp tretthet akkumulert",
    "coach.deepFatigueDesc": "Din treningsbalanse er sv\u00e6rt negativ. Prioriter s\u00f8vn, ern\u00e6ring og rolig l\u00f8ping de neste dagene.",
    "coach.balancedLoad": "Treningsbelastning i balanse",
    "coach.balancedLoadDesc": "Din akutte og kroniske belastning er godt matchet. Du er i en b\u00e6rekraftig treningsrytme.",
    "coach.fitnessGrowing": "Formen bygges opp",
    "coach.fitnessGrowingDesc": "Din kroniske treningsbelastning har \u00f8kt de siste 4 ukene. Konsistensen gir resultater.",
    "coach.fitnessDeclining": "Formen synker",
    "coach.fitnessDecliningDesc": "Din kroniske belastning har falt de siste 4 ukene. Pr\u00f8v \u00e5 opprettholde konsistent trening.",
    "coach.volumeSpike": "Volum\u00f8kning denne uken",
    "coach.volumeSpikeDesc": "Distansen din denne uken er 15%+ over forrige uke. Plutselige hopp \u00f8ker skaderisikoen \u2014 s\u00f8rg for tilstrekkelig restitusjon.",
    "coach.longRunProgressing": "Langturene utvikler seg bra",
    "coach.longRunProgressingDesc": "Dine siste 3 langturer viser en sunn oppadg\u00e5ende trend i distanse. Fortsett \u00e5 bygge gradvis.",
    "coach.needsRest": "Hviledag anbefalt",
    "coach.needsRestDesc": "H\u00f8y tretthet kombinert med d\u00e5rlig s\u00f8vnkvalitet signaliserer at kroppen trenger restitusjon.",
    "coach.elevatedFatigue": "Trettheten er forh\u00f8yet",
    "coach.elevatedFatigueDesc": "Innsjekken din viser h\u00f8y tretthet. Vurder \u00e5 redusere intensiteten og fokuser p\u00e5 restitusjon.",
    "coach.highMotivation": "Motivasjonen er sterk",
    "coach.highMotivationDesc": "Flott innstilling! Kanaliser denne energien inn i en kvalitets\u00f8kt mens du holder deg innenfor planstrukturen.",
    "coach.niggleAlert": "Sm\u00e5plage-varsel",
    "coach.niggleAlertDesc": "Du rapporterte en sm\u00e5plage i siste innsjekk. Overv\u00e5k n\u00f8ye og reduser belastning hvis det forverres.",
    "coach.raceWeekApproaching": "L\u00f8psuken er her",
    "coach.raceWeekApproachingDesc": "L\u00f8pet ditt er innen 2 uker. Fokuser p\u00e5 hvile, ern\u00e6ring og mental forberedelse. Stol p\u00e5 treningen.",
    "coach.taperPhase": "Nedtrappingstid",
    "coach.taperPhaseDesc": "L\u00f8pet ditt er 3\u20134 uker unna. Begynn \u00e5 redusere volum mens du opprettholder litt intensitet for \u00e5 holde deg skarp.",
    "coach.getStarted": "Kom i gang",
    "coach.getStartedDesc": "Synkroniser Strava-kontoen din eller logg en trening for \u00e5 begynne \u00e5 motta personlige treningsinnsikter.",
    "coach.getAIInsights": "Hent AI-treningsinnsikt",
    "coach.aiLoading": "Analyserer treningen din\u2026",
    "coach.aiError": "AI-coaching utilgjengelig. Viser regelbaserte innsikter.",
    "coach.aiBadge": "AI",
    "coach.ruleBasedSection": "Treningsanalyse",
    "coach.aiSection": "AI-coaching",

    // Weekly calendar
    "cal.title": "Ukentlig treningskalender",
    "cal.easy": "Rolig",
    "cal.recovery": "Restitusjon",
    "cal.intensity": "Intensitet",
    "cal.long": "Langtur",
    "cal.mediumLong": "Mellomlang",
    "cal.rest": "Hvile",
    "cal.race": "Løp",
    "cal.easyRun": "Rolig løp",
    "cal.recoveryRun": "Restitusjonsløp",
    "cal.longRun": "Langtur",
    "cal.shakeout": "Uttøyingsløp",
    "cal.raceDay": "Løpsdag",
    "cal.totalVolume": "totalt volum",
    "cal.longRunLabel": "langtur",
    "cal.currentWeek": "Denne uken",
    "cal.editTitle": "Rediger trening",
    "cal.editType": "Treningstype",
    "cal.editName": "Treningsnavn",
    "cal.editDistance": "Distanse (km)",
    "cal.editNotes": "Notater",
    "cal.editSave": "Lagre",
    "cal.editReset": "Tilbakestill til plan",
    "cal.editSaving": "Lagrer\u2026",
    "cal.editSaved": "Lagret!",

    // Intensity
    "intensity.z1": "S1 - Restitusjon",
    "intensity.z2": "S2 - Rolig / Aerob",
    "intensity.z3": "S3 - Tempo",
    "intensity.z4": "S4 - Terskel",
    "intensity.z5": "S5 - VO2maks",
    "intensity.race": "L\u00f8psinnsats",
    "cal.editIntensity": "Intensitet",
    "cal.editDescription": "Treningsbeskrivelse",
    "cal.weeklyIntensity": "Ukentlig intensitet",
    "ph.workoutDesc": "f.eks. 3km oppvarming, 4x1km i tempofart med 90s jogg restitusjon, 2km nedjogg",

    // Language
    "lang.en": "English",
    "lang.no": "Norsk",

    // App shell navigation groups
    "nav.general": "Generelt",
    "nav.other": "Annet",
    "nav.trainingPlan": "Treningsplan",
    "nav.weeklyPlan": "Ukeplan",
    "nav.dailyLog": "Dagslogg",
    "nav.pages": "Sider",
    "nav.search": "S\u00f8k",

    // Coach page — new conversational UI
    "coach.aiCoachSubtitle": "Din AI-l\u00f8petrener",
    "coach.showConversations": "Samtaler",
    "coach.hide": "Skjul",
    "coach.newConversation": "+ Ny samtale",
    "coach.noConversations": "Ingen samtaler enn\u00e5.",
    "coach.deleteConv": "Slette denne samtalen?",
    "coach.delete": "Slett",
    "coach.cancel": "Avbryt",
    "coach.emptyState": "Velg en samtale eller klikk + Ny samtale for \u00e5 begynne.",
    "coach.clickRefresh": "Klikk Oppdater coaching for \u00e5 f\u00e5 AI-drevne innsikter basert p\u00e5 dine treningsdata.",
    "coach.refreshCoaching": "Oppdater coaching",
    "coach.analyzingBtn": "Analyserer\u2026",
    "coach.analyzingMsg": "Analyserer treningsdataene dine med Gemini AI\u2026",
    "coach.followupPlaceholder": "Still et oppf\u00f8lgingssp\u00f8rsm\u00e5l\u2026",
    "coach.send": "Send",
    "coach.dismiss": "Lukk",
    "coach.trainingDataAnalyzed": "Treningsdata analysert",
    "coach.noPlan": "Ingen treningsplan funnet.",
    "coach.createPlanFirst": "Opprett en treningsplan f\u00f8rst for personlig coaching.",
    "coach.goalRace": "M\u00e5ll\u00f8p",
    "coach.currentPhase": "N\u00e5v\u00e6rende fase",
    "coach.week": "Uke",
    "coach.targetVolume": "M\u00e5lvolum",
    "coach.daysToRace": "dager til l\u00f8p",
    "coach.last7Days": "Siste 7 dager",
    "coach.mood": "Hum\u00f8r",
    "coach.aboutYou": "Om deg",
    "coach.profileDescPre": "Sendt til AI-treneren. M\u00e5let ditt er satt p\u00e5",
    "coach.profileDescPost": "siden.",
    "coach.runningBackground": "L\u00f8pebakgrunn",
    "coach.bgPlaceholder": "f.eks. L\u00f8pt i 3 \u00e5r, mest stier",
  },
};

let currentLang = localStorage.getItem("runsmart-lang") || "en";

const i18nSubscribers = new Set();

function notifyI18nSubscribers() {
  i18nSubscribers.forEach(function (callback) {
    callback(currentLang);
  });
}

function createI18nProvider() {
  return {
    getLanguage: function () { return currentLang; },
    setLanguage: function (lang) {
      setLanguage(lang);
    },
    t: t,
    applyTranslations: applyTranslations,
    subscribe: function (callback) {
      i18nSubscribers.add(callback);
      return function unsubscribe() {
        i18nSubscribers.delete(callback);
      };
    },
  };
}

const i18nProvider = createI18nProvider();

export function useI18n() {
  // Subscribe to module-level language changes; triggers React re-render on switch
  useSyncExternalStore(
    (callback) => {
      i18nSubscribers.add(callback);
      return () => i18nSubscribers.delete(callback);
    },
    () => currentLang,
    () => "en",
  );
  return { t, lang: currentLang, setLanguage };
}

export function getCurrentLanguage() {
  return currentLang;
}


export function t(key) {
  var dict = TRANSLATIONS[currentLang] || TRANSLATIONS.en;
  return dict[key] || TRANSLATIONS.en[key] || key;
}

export function setLanguage(lang) {
  currentLang = lang;
  localStorage.setItem("runsmart-lang", lang);
  document.documentElement.lang = lang;
  notifyI18nSubscribers();
}

export function applyTranslations() {
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

export { createI18nProvider };
