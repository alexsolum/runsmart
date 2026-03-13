// ---- Pure computation functions (testable, no DOM) ----

"use strict";

  // ---- Date helpers ----

  function getWeekStart(date) {
    var d = new Date(date);
    var day = d.getUTCDay();
    var diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
    d.setUTCDate(diff);
    d.setUTCHours(0, 0, 0, 0);
    return d;
  }

  // ---- Weekly summary ----

  function computeWeeklySummary(activities) {
    var weeks = {};
    activities.forEach(function (a) {
      var ws = getWeekStart(new Date(a.started_at));
      var key = ws.toISOString().split("T")[0];
      if (!weeks[key]) weeks[key] = { distance: 0, elevation: 0, time: 0, count: 0 };
      weeks[key].distance += Number(a.distance) || 0;
      weeks[key].elevation += Number(a.elevation_gain) || 0;
      weeks[key].time += Number(a.moving_time) || 0;
      weeks[key].count++;
    });
    return weeks;
  }

  // ---- Training blocks ----

  function computeTrainingBlocks(plan) {
    var today = new Date();
    var raceDate = new Date(plan.race_date);
    var totalWeeks = Math.max(4, Math.ceil((raceDate - today) / (7 * 24 * 60 * 60 * 1000)));

    var baseWeeks = Math.max(1, Math.round(totalWeeks * 0.30));
    var buildWeeks = Math.max(1, Math.round(totalWeeks * 0.30));
    var peakWeeks = Math.max(1, Math.round(totalWeeks * 0.25));
    var taperWeeks = Math.max(1, totalWeeks - baseWeeks - buildWeeks - peakWeeks);

    var baseMileage = plan.current_mileage || 50;

    var blocks = [
      { name: "Base", weeks: baseWeeks, startMi: baseMileage, endMi: Math.round(baseMileage * 1.15), color: "#3b82f6", desc: "Aerobic foundation, easy volume" },
      { name: "Build", weeks: buildWeeks, startMi: Math.round(baseMileage * 1.15), endMi: Math.round(baseMileage * 1.35), color: "#f59e0b", desc: "Intensity + specificity" },
      { name: "Peak", weeks: peakWeeks, startMi: Math.round(baseMileage * 1.35), endMi: Math.round(baseMileage * 1.45), color: "#ef4444", desc: "Race-specific simulation" },
      { name: "Taper", weeks: taperWeeks, startMi: Math.round(baseMileage * 0.7), endMi: Math.round(baseMileage * 0.5), color: "#22c55e", desc: "Recovery + sharpening" },
    ];

    if (plan.b2b_long_runs) {
      blocks[1].desc += " + B2B long weekends";
      blocks[2].desc += " + B2B long weekends";
    }

    return blocks;
  }

  function computeCurrentBlock(plan) {
    var blocks = computeTrainingBlocks(plan);
    var today = new Date();
    var raceDate = new Date(plan.race_date);
    var totalWeeks = Math.max(4, Math.ceil((raceDate - today) / (7 * 24 * 60 * 60 * 1000)));
    var weeksOut = totalWeeks;
    var elapsed = 0;

    for (var i = 0; i < blocks.length; i++) {
      elapsed += blocks[i].weeks;
      if (elapsed >= (totalWeeks - weeksOut + 1) || i === blocks.length - 1) {
        return blocks[i];
      }
    }
    return blocks[0];
  }

  // ---- Training load (EWMA) ----

  function computeTrainingLoad(activities) {
    if (!activities.length) return [];

    var sorted = activities.slice().sort(function (a, b) {
      return new Date(a.started_at) - new Date(b.started_at);
    });

    var dailyLoad = {};
    sorted.forEach(function (a) {
      var day = new Date(a.started_at).toISOString().split("T")[0];
      dailyLoad[day] = (dailyLoad[day] || 0) + (Number(a.moving_time) || 0) / 60;
    });

    var firstDay = new Date(sorted[0].started_at);
    var today = new Date();
    var days = [];
    for (var d = new Date(firstDay); d <= today; d.setDate(d.getDate() + 1)) {
      var key = d.toISOString().split("T")[0];
      days.push({ date: key, load: dailyLoad[key] || 0 });
    }

    var alphaATL = 2 / (7 + 1);
    var alphaCTL = 2 / (42 + 1);
    var atl = 0, ctl = 0;

    return days.map(function (d) {
      atl = alphaATL * d.load + (1 - alphaATL) * atl;
      ctl = alphaCTL * d.load + (1 - alphaCTL) * ctl;
      return { date: d.date, atl: atl, ctl: ctl, tsb: ctl - atl };
    });
  }

  // ---- Training load state classification ----

  function computeTrainingLoadState(series) {
    if (!series || series.length < 2) return null;

    var latest = series[series.length - 1];
    var tsb = latest.tsb;

    // State classification using locked TSB thresholds
    var state, stateLabel;
    if (tsb > 10) {
      state = "good_form";
      stateLabel = "Good Form";
    } else if (tsb >= -5) {
      state = "neutral";
      stateLabel = "Neutral";
    } else if (tsb >= -15) {
      state = "accumulating_fatigue";
      stateLabel = "Accumulating Fatigue";
    } else {
      state = "overreaching_risk";
      stateLabel = "Overreaching Risk";
    }

    // Trend: compare latest tsb vs tsb at ~2 weeks ago (index series.length - 15)
    var twoWeeksAgoIdx = Math.max(0, series.length - 15);
    var twoWeeksTsb = series[twoWeeksAgoIdx].tsb;
    var tsbDelta = tsb - twoWeeksTsb;

    var trendLabel;
    if (tsbDelta > 2) {
      trendLabel = "Improving";
    } else if (tsbDelta < -2) {
      trendLabel = "Declining";
    } else {
      trendLabel = "Stable";
    }

    return { state: state, stateLabel: stateLabel, trendLabel: trendLabel, tsb: tsb };
  }

  // ---- Long run progression ----

  function computeLongRuns(activities) {
    var weeks = {};
    activities
      .filter(function (a) { return a.type === "Run"; })
      .forEach(function (a) {
        var ws = getWeekStart(new Date(a.started_at));
        var key = ws.toISOString().split("T")[0];
        var dist = Number(a.distance) || 0;
        if (!weeks[key] || dist > weeks[key].distance) {
          weeks[key] = {
            id: a.id,
            distance: dist,
            time: Number(a.moving_time) || 0,
            elevation: Number(a.elevation_gain) || 0,
            name: a.name,
          };
        }
      });

    return Object.entries(weeks).sort(function (a, b) { return a[0].localeCompare(b[0]); });
  }

  // ---- Heart rate zone aggregation ----

  function computeWeeklyHRZones(activities) {
    var weekly = {};
    activities.forEach(function(a) {
      var z1 = Number(a.hr_zone_1_seconds) || 0;
      var z2 = Number(a.hr_zone_2_seconds) || 0;
      var z3 = Number(a.hr_zone_3_seconds) || 0;
      var z4 = Number(a.hr_zone_4_seconds) || 0;
      var z5 = Number(a.hr_zone_5_seconds) || 0;
      if (z1 + z2 + z3 + z4 + z5 === 0) return;
      var ws = getWeekStart(new Date(a.started_at));
      var key = ws.toISOString().split("T")[0];
      if (!weekly[key]) weekly[key] = { z1: 0, z2: 0, z3: 0, z4: 0, z5: 0 };
      weekly[key].z1 += z1;
      weekly[key].z2 += z2;
      weekly[key].z3 += z3;
      weekly[key].z4 += z4;
      weekly[key].z5 += z5;
    });
    return Object.entries(weekly)
      .sort(function(a, b) { return a[0].localeCompare(b[0]); })
      .slice(-8)
      .map(function(entry) {
        var w = entry[1];
        return {
          weekStart: entry[0],
          z1: w.z1, z2: w.z2, z3: w.z3, z4: w.z4, z5: w.z5,
          total: w.z1 + w.z2 + w.z3 + w.z4 + w.z5,
        };
      });
  }

  function computeRecentActivityZones(activities) {
    return activities
      .filter(function(a) {
        return (Number(a.hr_zone_1_seconds) || 0) +
               (Number(a.hr_zone_2_seconds) || 0) +
               (Number(a.hr_zone_3_seconds) || 0) +
               (Number(a.hr_zone_4_seconds) || 0) +
               (Number(a.hr_zone_5_seconds) || 0) > 0;
      })
      .sort(function(a, b) { return new Date(b.started_at) - new Date(a.started_at); })
      .slice(0, 10)
      .map(function(a) {
        var z1 = Number(a.hr_zone_1_seconds) || 0;
        var z2 = Number(a.hr_zone_2_seconds) || 0;
        var z3 = Number(a.hr_zone_3_seconds) || 0;
        var z4 = Number(a.hr_zone_4_seconds) || 0;
        var z5 = Number(a.hr_zone_5_seconds) || 0;
        return {
          id: a.id,
          name: a.name,
          date: a.started_at,
          z1: z1, z2: z2, z3: z3, z4: z4, z5: z5,
          total: z1 + z2 + z3 + z4 + z5,
        };
      });
  }

  // ---- Format helpers ----

  function formatDistance(meters) {
    if (!meters) return "\u2014";
    return (meters / 1000).toFixed(1) + " km";
  }

  function formatDuration(seconds) {
    if (!seconds) return "\u2014";
    var h = Math.floor(seconds / 3600);
    var m = Math.floor((seconds % 3600) / 60);
    var s = seconds % 60;
    if (h > 0) return h + "h " + m + "m";
    return m + "m " + s + "s";
  }

  function formatPace(secPerKm) {
    if (!secPerKm) return "\u2014";
    var m = Math.floor(secPerKm / 60);
    var s = Math.round(secPerKm % 60);
    return m + ":" + String(s).padStart(2, "0") + " /km";
  }

  function formatElevation(meters) {
    if (!meters) return "\u2014";
    return Math.round(meters).toLocaleString() + " m";
  }

  function rpeClass(val) {
    if (val <= 4) return "easy";
    if (val <= 7) return "moderate";
    return "hard";
  }

  function trendArrow(current, previous) {
    if (!previous || previous === 0) return { text: "", cls: "flat" };
    var pct = Math.round(((current - previous) / previous) * 100);
    if (pct > 2) return { text: "+" + pct + "%", cls: "up" };
    if (pct < -2) return { text: pct + "%", cls: "down" };
    return { text: "~", cls: "flat" };
  }

  // ---- Koop periodization ----

  var KOOP_PHASES = {
    preparation: { color: "#6366f1" },
    endurance: { color: "#3b82f6" },
    specificPrep: { color: "#f59e0b" },
    taper: { color: "#22c55e" },
  };

  var KOOP_PHASE_KEYS = {
    preparation: "gantt.preparation",
    endurance: "gantt.endurance",
    specificPrep: "gantt.specificPrep",
    taper: "gantt.taper",
  };

  var KOOP_WORKOUTS = {
    preparation: ["gantt.easyVolume", "gantt.steadyState", "gantt.tempo"],
    endurance: ["gantt.steadyState", "gantt.tempo", "gantt.enduranceRun", "gantt.muscleTension"],
    specificPrep: ["gantt.muscleTension", "gantt.overUnder", "gantt.raceSimulation", "gantt.tempo"],
    taper: ["gantt.steadyState", "gantt.tempo"],
  };

  function computeKoopPlan(plan) {
    var today = new Date();
    var raceDate = new Date(plan.race_date);
    var totalWeeks = Math.max(4, Math.ceil((raceDate - today) / (7 * 24 * 60 * 60 * 1000)));

    var prepWeeks = Math.max(1, Math.round(totalWeeks * 0.15));
    var enduranceWeeks = Math.max(1, Math.round(totalWeeks * 0.35));
    var specificWeeks = Math.max(1, Math.round(totalWeeks * 0.35));
    var taperWeeks = Math.max(1, totalWeeks - prepWeeks - enduranceWeeks - specificWeeks);

    var baseMileage = plan.current_mileage || 50;
    var peakMileage = Math.round(baseMileage * 1.45);

    var phases = [
      { key: "preparation", weeks: prepWeeks, startMi: baseMileage, endMi: Math.round(baseMileage * 1.1) },
      { key: "endurance", weeks: enduranceWeeks, startMi: Math.round(baseMileage * 1.1), endMi: Math.round(baseMileage * 1.3) },
      { key: "specificPrep", weeks: specificWeeks, startMi: Math.round(baseMileage * 1.3), endMi: peakMileage },
      { key: "taper", weeks: taperWeeks, startMi: Math.round(peakMileage * 0.8), endMi: Math.round(baseMileage * 0.5) },
    ];

    var weeks = [];
    var weekNum = 1;
    var planStart = getWeekStart(today);

    phases.forEach(function (phase) {
      var workouts = KOOP_WORKOUTS[phase.key];
      for (var i = 0; i < phase.weeks; i++) {
        var weekDate = new Date(planStart);
        weekDate.setDate(weekDate.getDate() + (weekNum - 1) * 7);

        var cycle = phase.weeks > 8 ? 4 : 3;
        var recovery = phase.weeks > 2 && i > 0 && (i + 1) % cycle === 0;

        var progressFrac = phase.weeks > 1 ? i / (phase.weeks - 1) : 0;
        var mileage = Math.round(phase.startMi + (phase.endMi - phase.startMi) * progressFrac);
        if (recovery) mileage = Math.round(mileage * 0.65);

        var longRunMi = Math.round(mileage * 0.3);
        var workoutKey = recovery ? "gantt.recoveryWeek" : workouts[i % workouts.length];

        var notesKey = "";
        if (recovery) notesKey = "gantt.recoveryWeek";
        if (plan.b2b_long_runs && (phase.key === "specificPrep" || phase.key === "endurance") && !recovery && i > 0) {
          notesKey = "gantt.b2bLong";
        }

        var weekEnd = new Date(weekDate);
        weekEnd.setDate(weekEnd.getDate() + 7);
        var isCurrent = today >= weekDate && today < weekEnd;

        weeks.push({
          week: weekNum,
          date: weekDate,
          phase: phase.key,
          mileage: mileage,
          longRun: longRunMi,
          workoutKey: workoutKey,
          recovery: recovery,
          notesKey: notesKey,
          isCurrent: isCurrent,
        });

        weekNum++;
      }
    });

    weeks.push({
      week: weekNum,
      date: raceDate,
      phase: "race",
      mileage: 0,
      longRun: 0,
      workoutKey: "gantt.raceDay",
      recovery: false,
      notesKey: "gantt.raceWeek",
      isCurrent: false,
    });

    return { weeks: weeks, phases: phases, totalWeeks: totalWeeks, peakMileage: peakMileage };
  }

  // ---- AI Coach: rule-based coaching insights ----

  function generateCoachingInsights(options) {
    var activities = options.activities || [];
    var checkins = options.checkins || [];
    var plans = options.plans || [];
    var insights = [];

    // Training load analysis
    var loadSeries = computeTrainingLoad(activities);
    if (loadSeries.length >= 7) {
      var last = loadSeries[loadSeries.length - 1];
      var tsb = last.tsb;
      var ratio = last.ctl > 0 ? last.atl / last.ctl : 0;

      // Overtraining risk
      if (ratio > 1.5) {
        insights.push({
          type: "danger",
          icon: "warning",
          titleKey: "coach.overtrainingRisk",
          descKey: "coach.overtrainingRiskDesc",
          priority: 1,
        });
      } else if (ratio > 1.2) {
        insights.push({
          type: "warning",
          icon: "alert",
          titleKey: "coach.highLoadRatio",
          descKey: "coach.highLoadRatioDesc",
          priority: 2,
        });
      }

      // Form/freshness
      if (tsb > 10) {
        insights.push({
          type: "positive",
          icon: "battery",
          titleKey: "coach.wellRested",
          descKey: "coach.wellRestedDesc",
          priority: 3,
        });
      } else if (tsb < -15) {
        insights.push({
          type: "warning",
          icon: "fatigue",
          titleKey: "coach.deepFatigue",
          descKey: "coach.deepFatigueDesc",
          priority: 2,
        });
      } else if (tsb >= -5 && tsb <= 5) {
        insights.push({
          type: "info",
          icon: "balance",
          titleKey: "coach.balancedLoad",
          descKey: "coach.balancedLoadDesc",
          priority: 4,
        });
      }

      // Fitness building
      if (last.ctl > 0 && loadSeries.length >= 28) {
        var fourWeeksAgo = loadSeries[loadSeries.length - 28];
        if (fourWeeksAgo && last.ctl > fourWeeksAgo.ctl * 1.1) {
          insights.push({
            type: "positive",
            icon: "trending",
            titleKey: "coach.fitnessGrowing",
            descKey: "coach.fitnessGrowingDesc",
            priority: 3,
          });
        } else if (fourWeeksAgo && last.ctl < fourWeeksAgo.ctl * 0.85) {
          insights.push({
            type: "warning",
            icon: "decline",
            titleKey: "coach.fitnessDeclining",
            descKey: "coach.fitnessDecliningDesc",
            priority: 2,
          });
        }
      }
    }

    // Weekly volume trends
    var weeklySummary = computeWeeklySummary(activities);
    var weekKeys = Object.keys(weeklySummary).sort().reverse();
    if (weekKeys.length >= 2) {
      var thisWeek = weeklySummary[weekKeys[0]];
      var lastWeek = weeklySummary[weekKeys[1]];
      if (lastWeek.distance > 0) {
        var volumeChange = ((thisWeek.distance - lastWeek.distance) / lastWeek.distance) * 100;
        if (volumeChange > 15) {
          insights.push({
            type: "warning",
            icon: "spike",
            titleKey: "coach.volumeSpike",
            descKey: "coach.volumeSpikeDesc",
            priority: 2,
          });
        }
      }
    }

    // Long run analysis
    var longRuns = computeLongRuns(activities);
    if (longRuns.length >= 3) {
      var recentLong = longRuns.slice(-3);
      var increasing = recentLong.every(function (lr, i) {
        return i === 0 || lr[1].distance >= recentLong[i - 1][1].distance;
      });
      if (increasing) {
        insights.push({
          type: "positive",
          icon: "longrun",
          titleKey: "coach.longRunProgressing",
          descKey: "coach.longRunProgressingDesc",
          priority: 4,
        });
      }
    }

    // Check-in analysis
    if (checkins.length > 0) {
      var latest = checkins[0];
      if (latest.fatigue >= 4 && latest.sleep_quality <= 2) {
        insights.push({
          type: "danger",
          icon: "rest",
          titleKey: "coach.needsRest",
          descKey: "coach.needsRestDesc",
          priority: 1,
        });
      } else if (latest.fatigue >= 4) {
        insights.push({
          type: "warning",
          icon: "fatigue",
          titleKey: "coach.elevatedFatigue",
          descKey: "coach.elevatedFatigueDesc",
          priority: 2,
        });
      }
      if (latest.motivation >= 4) {
        insights.push({
          type: "positive",
          icon: "motivation",
          titleKey: "coach.highMotivation",
          descKey: "coach.highMotivationDesc",
          priority: 4,
        });
      }
      if (latest.niggles) {
        insights.push({
          type: "warning",
          icon: "injury",
          titleKey: "coach.niggleAlert",
          descKey: "coach.niggleAlertDesc",
          meta: latest.niggles,
          priority: 1,
        });
      }
    }

    // Race proximity
    var futurePlans = plans.filter(function (p) { return new Date(p.race_date) > new Date(); });
    if (futurePlans.length > 0) {
      futurePlans.sort(function (a, b) { return new Date(a.race_date) - new Date(b.race_date); });
      var nextRace = futurePlans[0];
      var weeksOut = Math.ceil((new Date(nextRace.race_date) - new Date()) / (7 * 24 * 60 * 60 * 1000));
      if (weeksOut <= 2) {
        insights.push({
          type: "info",
          icon: "race",
          titleKey: "coach.raceWeekApproaching",
          descKey: "coach.raceWeekApproachingDesc",
          priority: 1,
        });
      } else if (weeksOut <= 4) {
        insights.push({
          type: "info",
          icon: "taper",
          titleKey: "coach.taperPhase",
          descKey: "coach.taperPhaseDesc",
          priority: 3,
        });
      }
    }

    // No data encouragement
    if (activities.length === 0) {
      insights.push({
        type: "info",
        icon: "start",
        titleKey: "coach.getStarted",
        descKey: "coach.getStartedDesc",
        priority: 5,
      });
    }

    // Sort by priority
    insights.sort(function (a, b) { return a.priority - b.priority; });

    return insights;
  }

  // ---- Weekly calendar distribution ----

  function computeWeeklyCalendar(weekData, availability, b2bLongRuns) {
    var mileage = weekData.mileage;
    var longRunMi = weekData.longRun;
    var weekDate = new Date(weekData.date);

    var days = [];
    for (var i = 0; i < 7; i++) {
      var d = new Date(weekDate);
      d.setDate(d.getDate() + i);
      days.push({ date: d, type: null, labelKey: "", distance: 0, intensity: "z2", description: "" });
    }

    // Race week
    if (weekData.phase === "race") {
      for (var r = 0; r < 7; r++) {
        days[r].type = "rest";
        days[r].labelKey = "cal.rest";
        days[r].intensity = "z1";
      }
      days[6].type = "race";
      days[6].labelKey = "cal.raceDay";
      days[6].intensity = "race";
      days[1].type = "easy";
      days[1].labelKey = "cal.shakeout";
      days[1].distance = 5;
      days[1].intensity = "z1";
      days[3].type = "easy";
      days[3].labelKey = "cal.shakeout";
      days[3].distance = 3;
      days[3].intensity = "z1";
      return days;
    }

    var remaining = mileage;

    // Long run on Sunday (index 6)
    days[6].type = "long";
    days[6].labelKey = "cal.longRun";
    days[6].distance = longRunMi;
    days[6].intensity = "z2";
    remaining -= longRunMi;

    // Key workout on Wednesday (index 2) unless recovery week
    if (!weekData.recovery) {
      var keyDist = Math.max(5, Math.round(mileage * 0.15));
      days[2].type = "intensity";
      days[2].labelKey = weekData.workoutKey;
      days[2].distance = keyDist;
      days[2].intensity = weekData.phase === "specificPrep" ? "z4" : "z3";
      remaining -= keyDist;
    }

    // B2B medium-long on Saturday (index 5)
    var isB2BWeek = b2bLongRuns && !weekData.recovery &&
      (weekData.phase === "endurance" || weekData.phase === "specificPrep");
    if (isB2BWeek) {
      var medLongDist = Math.round(longRunMi * 0.65);
      days[5].type = "medium-long";
      days[5].labelKey = "cal.mediumLong";
      days[5].distance = medLongDist;
      days[5].intensity = "z2";
      remaining -= medLongDist;
    }

    // Rest days based on availability
    var restIndices = availability <= 5 ? [0, 4] : availability === 6 ? [0] : [];
    restIndices.forEach(function (idx) {
      if (days[idx].type === null) {
        days[idx].type = "rest";
        days[idx].labelKey = "cal.rest";
        days[idx].intensity = "z1";
      }
    });

    // Fill remaining null days with easy/recovery runs
    var emptyIndices = [];
    for (var e = 0; e < 7; e++) {
      if (days[e].type === null) emptyIndices.push(e);
    }

    if (emptyIndices.length > 0 && remaining > 0) {
      var perDay = Math.round(remaining / emptyIndices.length);
      emptyIndices.forEach(function (idx, pos) {
        var dist = pos === emptyIndices.length - 1
          ? Math.max(3, remaining - perDay * (emptyIndices.length - 1))
          : Math.max(3, perDay);
        days[idx].type = weekData.recovery ? "recovery" : "easy";
        days[idx].labelKey = weekData.recovery ? "cal.recoveryRun" : "cal.easyRun";
        days[idx].distance = dist;
        days[idx].intensity = weekData.recovery ? "z1" : "z2";
      });
    } else {
      emptyIndices.forEach(function (idx) {
        days[idx].type = "rest";
        days[idx].labelKey = "cal.rest";
        days[idx].intensity = "z1";
      });
    }

    return days;
  }

  // ---- Weekly progress: cumulative km executed vs planned vs 4-week avg ----

  function computeWeeklyProgress(activities, workoutEntries) {
    var today = new Date();
    var todayStr = today.toISOString().split("T")[0];

    // Monday of current week (UTC)
    var monday = new Date(today);
    var utcDay = monday.getUTCDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    var diffToMon = utcDay === 0 ? -6 : 1 - utcDay;
    monday.setUTCDate(monday.getUTCDate() + diffToMon);
    monday.setUTCHours(0, 0, 0, 0);

    var DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    // Build 7 day date strings Mon–Sun
    var weekDates = [];
    for (var i = 0; i < 7; i++) {
      var wd = new Date(monday);
      wd.setUTCDate(wd.getUTCDate() + i);
      weekDates.push(wd.toISOString().split("T")[0]);
    }

    // Index Strava km by ISO date
    var actKmByDay = {};
    (activities || []).forEach(function(a) {
      var day = new Date(a.started_at).toISOString().split("T")[0];
      actKmByDay[day] = (actKmByDay[day] || 0) + (Number(a.distance) || 0) / 1000;
    });

    // Index plan km by ISO date
    var planKmByDay = {};
    (workoutEntries || []).forEach(function(e) {
      if (e.workout_date) {
        planKmByDay[e.workout_date] = (planKmByDay[e.workout_date] || 0) + (Number(e.distance_km) || 0);
      }
    });

    // 4-week avg: average per-day-of-week km across 4 prior weeks
    var avgByDow = [0, 0, 0, 0, 0, 0, 0];
    for (var w = 1; w <= 4; w++) {
      for (var dow = 0; dow < 7; dow++) {
        var priorDay = new Date(monday);
        priorDay.setUTCDate(priorDay.getUTCDate() - w * 7 + dow);
        var priorStr = priorDay.toISOString().split("T")[0];
        avgByDow[dow] += actKmByDay[priorStr] || 0;
      }
    }
    for (var ai = 0; ai < 7; ai++) avgByDow[ai] /= 4;

    // Build cumulative day series
    var execCumul = 0;
    var planCumul = 0;
    var avgCumul = 0;

    var days = weekDates.map(function(dateStr, idx) {
      var isToday = dateStr === todayStr;
      var isFuture = dateStr > todayStr;
      var stravaKm = actKmByDay[dateStr] || 0;
      var planKm = planKmByDay[dateStr] || 0;

      // Executed: cumulative Strava km up to and including today (0 for future)
      if (!isFuture) execCumul += stravaKm;

      // Planned (additive): future days or today without any Strava activity
      var addedPlan = 0;
      if (isFuture || (isToday && stravaKm === 0)) addedPlan = planKm;
      planCumul += addedPlan;

      avgCumul += avgByDow[idx];

      return {
        day: DAY_LABELS[idx],
        date: dateStr,
        isToday: isToday,
        isFuture: isFuture,
        executed: +execCumul.toFixed(1),
        planned: +planCumul.toFixed(1),
        avg: +avgCumul.toFixed(1),
      };
    });

    return {
      days: days,
      totalExecuted: +execCumul.toFixed(1),
      totalPlanned: +planCumul.toFixed(1),
    };
  }

  // ---- Advanced Analytics: Linear Regression & Aerobic Efficiency ----

  function linearRegression(points) {
    var n = points.length;
    if (n < 2) return { slope: 0, intercept: 0, rSquared: 0 };

    var sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
    for (var i = 0; i < n; i++) {
      var x = points[i].x;
      var y = points[i].y;
      sumX += x;
      sumY += y;
      sumXY += (x * y);
      sumX2 += (x * x);
      sumY2 += (y * y);
    }

    var num = (n * sumXY) - (sumX * sumY);
    var den = (n * sumX2) - (sumX * sumX);
    if (den === 0) return { slope: 0, intercept: sumY / n, rSquared: 0 };

    var slope = num / den;
    var intercept = (sumY - slope * sumX) / n;

    var rNum = num;
    var rDen = Math.sqrt(((n * sumX2) - (sumX * sumX)) * ((n * sumY2) - (sumY * sumY)));
    var rSquared = rDen === 0 ? 0 : Math.pow(rNum / rDen, 2);

    return { slope: slope, intercept: intercept, rSquared: rSquared };
  }

  function getMinettiFactor(grade) {
    // grade is fractional (e.g. 0.05 for 5%)
    // C(i) = 155.4*i^5 - 30.4*i^4 - 43.3*i^3 + 46.3*i^2 + 19.5*i + 3.6
    // Factor relative to flat (i=0, C=3.6)
    var i = grade;
    var c = (155.4 * Math.pow(i, 5)) -
            (30.4 * Math.pow(i, 4)) -
            (43.3 * Math.pow(i, 3)) +
            (46.3 * Math.pow(i, 2)) +
            (19.5 * i) +
            3.6;
    return c / 3.6;
  }

  function percentile(values, ratio) {
    if (!values || !values.length) return 0;
    var sorted = values.slice().sort(function(a, b) { return a - b; });
    var index = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * ratio)));
    return sorted[index];
  }

  function estimateMaxHeartRate(activities) {
    var explicitMax = (activities || [])
      .map(function(a) { return Number(a.max_heartrate) || 0; })
      .filter(Boolean);
    if (explicitMax.length) return Math.max.apply(null, explicitMax);

    var avgHrs = (activities || [])
      .map(function(a) { return Number(a.average_heartrate) || 0; })
      .filter(Boolean);
    if (!avgHrs.length) return 190;

    // Fall back to observed aerobic history when no athlete max HR is stored.
    return Math.max(190, Math.round(percentile(avgHrs, 0.95) / 0.8));
  }

  function isSupportedEfficiencyType(activity) {
    var type = String(activity && activity.type || "").toLowerCase();
    return type === "run" || type === "ride" || type === "cycling" || type === "cycle";
  }

  function getSpeedMetersPerMinute(activity) {
    var avgSpeed = Number(activity.average_speed) || 0;
    if (avgSpeed > 0) return avgSpeed * 60;
    var distance = Number(activity.distance) || 0;
    var duration = Number(activity.moving_time) || 0;
    return duration > 0 ? (distance / duration) * 60 : 0;
  }

  function getOutputMetric(activity) {
    var watts = Number(activity.average_watts || activity.weighted_average_watts) || 0;
    if (watts > 0) {
      return { value: watts, unit: "watts", label: "Power" };
    }
    return { value: getSpeedMetersPerMinute(activity), unit: "m_per_min", label: "Speed" };
  }

  function getTerrainPer5k(activity) {
    var distance = Number(activity.distance) || 0;
    var elevation = Number(activity.elevation_gain) || 0;
    return distance > 0 ? (elevation * 5000) / distance : 0;
  }

  function isEfficiencyActivity(activity, maxHeartRate) {
    if (!activity || !isSupportedEfficiencyType(activity)) return false;

    var duration = Number(activity.moving_time) || 0;
    var avgHr = Number(activity.average_heartrate) || 0;
    var distance = Number(activity.distance) || 0;
    var output = getOutputMetric(activity);

    if (duration < 1800 || avgHr <= 0 || distance <= 0 || output.value <= 0) return false;
    if (getTerrainPer5k(activity) > 50) return false;
    return avgHr <= maxHeartRate * 0.8;
  }

  function toEfficiencyPoint(activity) {
    var date = activity.started_at;
    var avgHr = Number(activity.average_heartrate) || 0;
    var output = getOutputMetric(activity);
    var duration = Number(activity.moving_time) || 0;
    var distance = Number(activity.distance) || 0;
    var speedMpm = getSpeedMetersPerMinute(activity);
    var speedKph = speedMpm * 0.06;
    return {
      id: activity.id,
      activityId: activity.id,
      name: activity.name,
      type: activity.type,
      date: date,
      x: new Date(date).getTime(),
      y: avgHr > 0 ? output.value / avgHr : 0,
      efficiencyFactor: avgHr > 0 ? output.value / avgHr : 0,
      averageHeartRate: avgHr,
      outputValue: output.value,
      outputUnit: output.unit,
      outputLabel: output.label,
      distance: distance,
      durationSeconds: duration,
      durationMinutes: duration / 60,
      terrainPer5k: getTerrainPer5k(activity),
      speedMpm: speedMpm,
      speedKph: speedKph,
      averagePaceSecondsPerKm: speedMpm > 0 ? 1000 / speedMpm * 60 : 0,
      averageWatts: Number(activity.average_watts || activity.weighted_average_watts) || null,
    };
  }

  function computeRollingAverage(points, windowDays) {
    var windowMs = windowDays * 24 * 60 * 60 * 1000;
    return points.map(function(point, index) {
      var cutoff = point.x - windowMs;
      var inWindow = points.filter(function(candidate, candidateIndex) {
        return candidateIndex <= index && candidate.x >= cutoff && candidate.x <= point.x;
      });
      var sum = inWindow.reduce(function(total, candidate) {
        return total + candidate.efficiencyFactor;
      }, 0);
      return {
        x: point.x,
        date: point.date,
        rollingAverage: inWindow.length ? sum / inWindow.length : point.efficiencyFactor,
      };
    });
  }

  function normalizeSplits(activity) {
    var rawSplits = [];
    if (Array.isArray(activity.splits_metric)) rawSplits = activity.splits_metric;
    else if (Array.isArray(activity.splits_standard)) rawSplits = activity.splits_standard;
    else if (Array.isArray(activity.laps)) rawSplits = activity.laps;

    var normalized = rawSplits
      .map(function(split) {
        return {
          time: Number(split.moving_time || split.elapsed_time || split.time) || 0,
          distance: Number(split.distance) || 0,
          hr: Number(split.average_heartrate || split.avg_hr || split.heartrate) || 0,
          watts: Number(split.average_watts || split.weighted_average_watts || split.avg_watts) || 0,
        };
      })
      .filter(function(split) {
        return split.time > 0 && split.distance > 0 && split.hr > 0;
      });

    if (normalized.length >= 2) return normalized;

    var firstHalfTime = Number(activity.first_half_moving_time || activity.first_half_elapsed_time) || 0;
    var secondHalfTime = Number(activity.second_half_moving_time || activity.second_half_elapsed_time) || 0;
    var firstHalfDistance = Number(activity.first_half_distance) || 0;
    var secondHalfDistance = Number(activity.second_half_distance) || 0;
    var firstHalfHr = Number(activity.first_half_average_heartrate) || 0;
    var secondHalfHr = Number(activity.second_half_average_heartrate) || 0;
    var firstHalfWatts = Number(activity.first_half_average_watts) || 0;
    var secondHalfWatts = Number(activity.second_half_average_watts) || 0;

    if (
      firstHalfTime > 0 &&
      secondHalfTime > 0 &&
      firstHalfDistance > 0 &&
      secondHalfDistance > 0 &&
      firstHalfHr > 0 &&
      secondHalfHr > 0
    ) {
      return [
        { time: firstHalfTime, distance: firstHalfDistance, hr: firstHalfHr, watts: firstHalfWatts },
        { time: secondHalfTime, distance: secondHalfDistance, hr: secondHalfHr, watts: secondHalfWatts },
      ];
    }

    return [];
  }

  function aggregateSplitWindow(splits, windowStart, windowEnd) {
    var elapsed = 0;
    var totalTime = 0;
    var totalDistance = 0;
    var hrSeconds = 0;
    var wattsSeconds = 0;

    for (var i = 0; i < splits.length; i++) {
      var split = splits[i];
      var splitStart = elapsed;
      var splitEnd = elapsed + split.time;
      elapsed = splitEnd;

      var overlapStart = Math.max(windowStart, splitStart);
      var overlapEnd = Math.min(windowEnd, splitEnd);
      var overlap = overlapEnd - overlapStart;
      if (overlap <= 0) continue;

      var ratio = overlap / split.time;
      totalTime += overlap;
      totalDistance += split.distance * ratio;
      hrSeconds += split.hr * overlap;
      wattsSeconds += split.watts * overlap;
    }

    if (totalTime <= 0 || hrSeconds <= 0) return null;

    var avgHr = hrSeconds / totalTime;
    var avgWatts = wattsSeconds > 0 ? wattsSeconds / totalTime : 0;
    var speedMpm = (totalDistance / totalTime) * 60;
    var outputValue = avgWatts > 0 ? avgWatts : speedMpm;

    return {
      time: totalTime,
      distance: totalDistance,
      averageHeartRate: avgHr,
      outputValue: outputValue,
      efficiencyFactor: avgHr > 0 ? outputValue / avgHr : 0,
    };
  }

  function computeActivityDecoupling(activity) {
    var splits = normalizeSplits(activity);
    if (splits.length < 2) return null;

    var totalTime = splits.reduce(function(sum, split) { return sum + split.time; }, 0);
    if (totalTime <= 0) return null;

    var midpoint = totalTime / 2;
    var firstHalf = aggregateSplitWindow(splits, 0, midpoint);
    var secondHalf = aggregateSplitWindow(splits, midpoint, totalTime);
    if (!firstHalf || !secondHalf || firstHalf.efficiencyFactor <= 0) return null;

    return {
      firstHalfEfficiency: firstHalf.efficiencyFactor,
      secondHalfEfficiency: secondHalf.efficiencyFactor,
      decouplingPercent:
        ((firstHalf.efficiencyFactor - secondHalf.efficiencyFactor) / firstHalf.efficiencyFactor) * 100,
    };
  }

  function computeEnduranceEfficiency(activities, options) {
    var windowDays = options && options.windowDays ? options.windowDays : 365;
    if (!activities || !activities.length) {
      return {
        maxHeartRate: 190,
        points: [],
        rollingAverage: [],
        decouplingPoints: [],
        rollingWindowDays: 30,
      };
    }

    var cutoff = new Date();
    cutoff.setUTCDate(cutoff.getUTCDate() - windowDays);

    var recent = activities.filter(function(activity) {
      return new Date(activity.started_at) >= cutoff;
    });
    var maxHeartRate = estimateMaxHeartRate(recent);
    var qualifying = recent.filter(function(activity) {
      return isEfficiencyActivity(activity, maxHeartRate);
    });

    var points = qualifying
      .map(function(activity) {
        return toEfficiencyPoint(activity);
      })
      .sort(function(a, b) {
        return a.x - b.x;
      });

    var rollingAverage = computeRollingAverage(points, 30);
    var rollingMap = {};
    rollingAverage.forEach(function(entry) {
      rollingMap[entry.x] = entry.rollingAverage;
    });

    points = points.map(function(point) {
      var decoupling = computeActivityDecoupling(qualifying.find(function(activity) {
        return activity.id === point.activityId;
      }));
      return {
        ...point,
        rollingAverage: rollingMap[point.x],
        decouplingPercent: decoupling ? decoupling.decouplingPercent : null,
      };
    });

    var decouplingPoints = points
      .filter(function(point) {
        return point.decouplingPercent != null && isFinite(point.decouplingPercent);
      })
      .map(function(point) {
        return {
          id: point.id,
          name: point.name,
          date: point.date,
          x: point.durationMinutes,
          y: point.decouplingPercent,
          durationMinutes: point.durationMinutes,
          efficiencyFactor: point.efficiencyFactor,
        };
      });

    return {
      maxHeartRate: maxHeartRate,
      points: points,
      rollingAverage: rollingAverage,
      decouplingPoints: decouplingPoints,
      rollingWindowDays: 30,
    };
  }

  function computeAerobicEfficiency(activities) {
    return computeEnduranceEfficiency(activities, { windowDays: 365 }).points;
  }

  function computeReferenceWorkouts(activities) {
    var efficiency = computeEnduranceEfficiency(activities, { windowDays: 365 });
    return {
      referenceKm: null,
      points: efficiency.points,
    };
  }

  function calculateTrendGain(points) {
    if (points.length < 2) return 0;
    var reg = linearRegression(points);
    var startX = points[0].x;
    var endX = points[points.length - 1].x;
    var startY = reg.intercept + reg.slope * startX;
    var endY = reg.intercept + reg.slope * endX;

    if (startY === 0) return 0;
    return ((endY - startY) / startY) * 100;
  }

export {
  getWeekStart,
  computeWeeklySummary,
  computeTrainingBlocks,
  computeCurrentBlock,
  computeTrainingLoad,
  computeTrainingLoadState,
  computeLongRuns,
  computeKoopPlan,
  computeWeeklyCalendar,
  computeWeeklyHRZones,
  computeRecentActivityZones,
  generateCoachingInsights,
  computeWeeklyProgress,
  linearRegression,
  getMinettiFactor,
  estimateMaxHeartRate,
  computeEnduranceEfficiency,
  computeAerobicEfficiency,
  computeReferenceWorkouts,
  calculateTrendGain,
  formatDistance,
  formatDuration,
  formatPace,
  formatElevation,
  rpeClass,
  trendArrow,
  KOOP_PHASES,
  KOOP_PHASE_KEYS,
  KOOP_WORKOUTS,
};
