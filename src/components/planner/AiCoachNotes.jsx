const NOTE_TITLES = {
  "coach.overtrainingRisk": "Overtraining risk detected",
  "coach.highLoadRatio": "Training load climbing fast",
  "coach.wellRested": "Well rested and ready",
  "coach.deepFatigue": "Deep fatigue accumulation",
  "coach.balancedLoad": "Training load balanced",
  "coach.fitnessGrowing": "Fitness is building",
  "coach.fitnessDeclining": "Fitness trending down",
  "coach.volumeSpike": "Volume spike this week",
  "coach.longRunProgressing": "Long runs progressing well",
  "coach.needsRest": "Rest day recommended",
  "coach.elevatedFatigue": "Fatigue is elevated",
  "coach.highMotivation": "Motivation is strong",
  "coach.niggleAlert": "Niggle alert",
  "coach.raceWeekApproaching": "Race week is here",
  "coach.taperPhase": "Taper time",
};

const NOTE_BODIES = {
  "coach.overtrainingRiskDesc": "Acute load is outpacing chronic load. Consider backing off to protect recovery.",
  "coach.highLoadRatioDesc": "Fatigue is building faster than fitness. Watch recovery closely.",
  "coach.wellRestedDesc": "Form is positive enough for a quality session if the rest of the week supports it.",
  "coach.deepFatigueDesc": "Stress balance is very negative. Prioritize sleep, fueling, and easier running.",
  "coach.balancedLoadDesc": "Recent training load looks sustainable and controlled.",
  "coach.fitnessGrowingDesc": "Consistency over the last month is building useful fitness.",
  "coach.fitnessDecliningDesc": "Chronic load has dropped. Regain consistency before adding more intensity.",
  "coach.volumeSpikeDesc": "This week has jumped sharply over the previous one. Avoid stacking extra stress.",
  "coach.longRunProgressingDesc": "Long-run progression is moving in the right direction without obvious disruption.",
  "coach.needsRestDesc": "Current recovery markers point toward a lighter day or full rest.",
  "coach.elevatedFatigueDesc": "Fatigue is elevated enough that intensity should be reconsidered today.",
  "coach.highMotivationDesc": "Motivation is high. Use it productively, but stay inside the plan.",
  "coach.niggleAlertDesc": "A niggle is present. Monitor it closely and reduce load if it worsens.",
  "coach.raceWeekApproachingDesc": "Shift emphasis toward freshness, execution, and routine.",
  "coach.taperPhaseDesc": "Start protecting recovery while keeping just enough intensity to stay sharp.",
};

function noteTitle(note) {
  return NOTE_TITLES[note?.titleKey] ?? note?.titleKey ?? "";
}

function noteBody(note) {
  return NOTE_BODIES[note?.descKey] ?? note?.descKey ?? "";
}

export function AiCoachNotes({ notes }) {
  if (!notes?.length) return null;

  return (
    <section className="plan-side-card" data-testid="plan-ai-notes">
      <div className="plan-side-card__header">
        <p className="cc-label">Coach</p>
        <h2 className="cc-headline" style={{ margin: 0 }}>
          AI Coach Notes
        </h2>
      </div>

      <div className="plan-ai-notes">
        {notes.map((note) => (
          <article key={`${note.titleKey}-${note.descKey}`} className={`plan-ai-note plan-ai-note--${note.type}`}>
            <p className="plan-ai-note__title">{noteTitle(note)}</p>
            <p className="plan-ai-note__body">{noteBody(note)}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export default AiCoachNotes;
