export const TELEMETRY_GROUPS = [
  {
    title: "Car Performance",
    metrics: [
      { key: "speed", label: "Speed", unit: "km/h", min: 180, max: 356, icon: "SPD", color: "#59f4ff" },
      { key: "rpm", label: "RPM", unit: "rpm", min: 9000, max: 15200, icon: "RPM", color: "#95b7ff" },
      { key: "aero", label: "Aero Load", unit: "%", min: 55, max: 99, icon: "AER", color: "#58ff9a" }
    ]
  },
  {
    title: "Tire And Track",
    metrics: [
      { key: "tireTemp", label: "Tire Temp", unit: "C", min: 78, max: 112, icon: "TIR", color: "#59f4ff" },
      { key: "grip", label: "Track Grip", unit: "%", min: 40, max: 99, icon: "GRP", color: "#6fe5d3" },
      { key: "degradation", label: "Degradation", unit: "%", min: 0, max: 100, icon: "DGR", color: "#ffcf6d" }
    ]
  },
  {
    title: "Environment",
    metrics: [
      { key: "rainRisk", label: "Rain Risk", unit: "%", min: 0, max: 100, icon: "RIN", color: "#76a9ff" },
      { key: "trackTemp", label: "Track Temp", unit: "C", min: 21, max: 49, icon: "TRK", color: "#ff9d68" }
    ]
  }
];

export const NN_LABEL_KEYS = [
  { key: "inputAttention", label: "Input Attention" },
  { key: "lstmAttention", label: "LSTM Context" },
  { key: "transformerAttention", label: "Transformer Weight" },
  { key: "rlPolicy", label: "RL Policy Confidence" }
];

export function generateTelemetryState(timeMs) {
  const t = timeMs * 0.001;

  const speed = wave(t + 0.6, 296, 54, 1.3);
  const rpm = wave(t + 1.1, 12900, 1550, 1.5);
  const aero = wave(t + 0.3, 83, 11, 0.9);
  const tireTemp = wave(t + 0.7, 96, 10, 0.8);
  const grip = wave(t * 0.35 + 1.2, 77, 12, 0.34);
  const rainRisk = wave(t * 0.2 + 0.8, 20, 26, 0.2);
  const trackTemp = wave(t * 0.4, 33, 5, 0.4);

  const degradation = clamp(18 + normalize(tireTemp, 78, 112) * 60 + normalize(rainRisk, 0, 100) * 16, 0, 100);
  const lapTime = clamp(82.3 - normalize(speed, 180, 356) * 2.0 + normalize(rainRisk, 0, 100) * 1.4, 74.5, 95.2);

  return {
    speed,
    rpm,
    aero,
    tireTemp,
    grip,
    degradation,
    rainRisk,
    trackTemp,
    lapTime
  };
}

export function generateIntelligenceState(timeMs, telemetry) {
  const t = timeMs * 0.001;

  const speedN = normalize(telemetry.speed, 180, 356);
  const tireN = normalize(telemetry.tireTemp, 78, 112);
  const gripN = normalize(telemetry.grip, 40, 99);
  const rainN = normalize(telemetry.rainRisk, 0, 100);
  const degN = normalize(telemetry.degradation, 0, 100);

  const planA = clamp(66 + gripN * 22 - rainN * 7 + Math.sin(t * 0.7) * 5, 0, 100);
  const planB = clamp(72 + speedN * 20 - degN * 8 + Math.sin(t * 0.9 + 0.7) * 4, 0, 100);
  const planC = clamp(61 + rainN * 16 + degN * 12 + Math.sin(t * 0.5 + 1.8) * 5, 0, 100);

  const strategies = [
    { name: "Plan A", score: planA, confidence: clamp(planA - 8 + Math.sin(t * 0.4) * 3, 0, 100) },
    { name: "Plan B", score: planB, confidence: clamp(planB - 5 + Math.sin(t * 0.5 + 0.3) * 3, 0, 100) },
    { name: "Plan C", score: planC, confidence: clamp(planC - 9 + Math.sin(t * 0.45 + 0.8) * 3, 0, 100) }
  ];

  const best = [...strategies].sort((a, b) => b.score - a.score)[0];
  const activePlan = best.name;

  const pitStart = Math.round(22 + degN * 6 + rainN * 3);
  const pitEnd = pitStart + 2;

  const predictedLap = clamp(telemetry.lapTime - normalize(best.score, 0, 100) * 1.4 + rainN * 1.2, 74.2, 95.0);
  const overtakeProbability = clamp(16 + speedN * 54 + gripN * 14 - rainN * 18, 0, 100);

  const decisions = [
    {
      title: "Pit Window",
      value: `Lap ${pitStart}-${pitEnd}`,
      score: clamp(58 + degN * 24 + rainN * 10, 0, 100),
      confidence: clamp(61 + gripN * 20 - rainN * 8, 0, 100)
    },
    {
      title: "Strategy",
      value: `${activePlan} ACTIVE`,
      score: best.score,
      confidence: best.confidence
    },
    {
      title: "Overtake Probability",
      value: `${overtakeProbability.toFixed(1)}%`,
      score: overtakeProbability,
      confidence: clamp(overtakeProbability - 4 + Math.sin(t * 0.6) * 3, 0, 100)
    }
  ];

  const factors = [
    { name: "Tire Wear", importance: clamp(40 + degN * 45 + Math.sin(t * 0.9) * 6, 0, 100) },
    { name: "Rain Risk", importance: clamp(32 + rainN * 52 + Math.sin(t * 0.8 + 0.5) * 5, 0, 100) },
    { name: "Track Grip", importance: clamp(30 + gripN * 44 + Math.sin(t * 0.7 + 1.1) * 5, 0, 100) }
  ];

  const alerts = [
    {
      title: "Engine Risk",
      level: clamp(18 + normalize(telemetry.rpm, 9000, 15200) * 66 + Math.sin(t * 1.1) * 5, 0, 100)
    },
    {
      title: "Collision Risk",
      level: clamp(14 + overtakeProbability * 0.55 + rainN * 24 + Math.sin(t * 0.9 + 0.6) * 5, 0, 100)
    }
  ];

  const nnLabels = {
    inputAttention: clamp(52 + Math.sin(t * 1.0) * 24, 0, 100),
    lstmAttention: clamp(47 + Math.sin(t * 1.2 + 0.8) * 26, 0, 100),
    transformerAttention: clamp(58 + Math.sin(t * 1.1 + 1.5) * 22, 0, 100),
    rlPolicy: clamp(best.confidence + Math.sin(t * 0.5) * 4, 0, 100)
  };

  return {
    activePlan,
    pitWindow: `Lap ${pitStart}-${pitEnd}`,
    predictedLap,
    simulations: 108 + Math.round(Math.sin(t * 0.65) * 9),
    latencyMs: Math.round(11 + Math.sin(t * 0.55 + 0.4) * 2),
    modelVersion: "v2.3",
    decisions,
    strategies,
    factors,
    alerts,
    nnLabels,
    timeline: {
      currentLap: 1 + Math.floor((timeMs / 1900) % 57),
      pitStart,
      pitEnd,
      events: [
        { lap: 9, type: "OVTK" },
        { lap: 17, type: "SC" },
        { lap: 24, type: "PIT" },
        { lap: 31, type: "OVTK" }
      ]
    }
  };
}

function wave(phase, base, amp, freq) {
  return base + Math.sin(phase * freq) * amp;
}

function normalize(value, min, max) {
  return clamp((value - min) / (max - min), 0, 1);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
