import * as THREE from "three";
import { TELEMETRY_GROUPS, NN_LABEL_KEYS, generateTelemetryState, generateIntelligenceState } from "./data.js";
import "./style.css";

const canvas = document.getElementById("scene-canvas");
const perfModeSelect = document.getElementById("perf-mode");
const telemetryGroupsEl = document.getElementById("telemetry-groups");
const decisionCardsEl = document.getElementById("decision-cards");
const explainabilityListEl = document.getElementById("explainability-list");
const alertListEl = document.getElementById("alert-list");
const nnLabelsEl = document.getElementById("nn-labels");
const nnGraphEl = document.getElementById("nn-graph");
const activePathEl = document.getElementById("active-path");
const systemStatusEl = document.getElementById("system-status");
const simCountEl = document.getElementById("sim-count");
const mlopsEl = document.getElementById("mlops");
const timelineCanvas = document.getElementById("timeline-canvas");
const timelineCtx = timelineCanvas.getContext("2d");

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.04;
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a0a);
scene.fog = new THREE.FogExp2(0x0a0a0a, 0.03);

const camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 0.1, 140);
camera.position.set(0, 7.8, 16.2);
camera.lookAt(0, 1.4, 0);

const clock = new THREE.Clock();
const sparkHistory = new Map();
const timelineHistory = [];
const HISTORY_LIMIT = 140;

addLights();
addEnvironment();
const car = createDigitalTwin();
scene.add(car);

const network = createNeuralNetworkHero();
scene.add(network.group);

const dataFlows = createDataFlows();
scene.add(dataFlows.group);

const ui = initializeUi();
const neuralOverlay = createNeuralOverlay();

window.addEventListener("resize", onResize);
perfModeSelect.addEventListener("change", applyPerformanceMode);

applyPerformanceMode();
resizeSparklineCanvases();
resizeTimelineCanvas();
animate();

function addLights() {
  scene.add(new THREE.AmbientLight(0x55728e, 0.26));

  const key = new THREE.SpotLight(0x7cd6ff, 6.5, 90, Math.PI / 6, 0.22, 1);
  key.position.set(10, 18, 8);
  key.target.position.set(0, 0.8, 0);
  scene.add(key, key.target);

  const cyanRim = new THREE.PointLight(0x59f4ff, 18, 50, 2);
  cyanRim.position.set(-10, 4, -4);
  scene.add(cyanRim);

  const greenFill = new THREE.PointLight(0x58ff9a, 16, 40, 2);
  greenFill.position.set(9, 4, 6);
  scene.add(greenFill);

  const amberFill = new THREE.PointLight(0xffcf6d, 9, 28, 2);
  amberFill.position.set(0, 4, -8);
  scene.add(amberFill);
}

function addEnvironment() {
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(20, 120),
    new THREE.MeshPhysicalMaterial({
      color: 0x0d0f15,
      roughness: 0.26,
      metalness: 0.7,
      clearcoat: 0.5,
      clearcoatRoughness: 0.18
    })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.35;
  scene.add(floor);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(8, 0.05, 16, 240),
    new THREE.MeshBasicMaterial({ color: 0x59f4ff, transparent: true, opacity: 0.3 })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = -1.22;
  scene.add(ring);
}

function createDigitalTwin() {
  const group = new THREE.Group();

  const body = new THREE.MeshPhysicalMaterial({
    color: 0x121924,
    metalness: 0.84,
    roughness: 0.2,
    clearcoat: 1,
    clearcoatRoughness: 0.08
  });

  const accent = new THREE.MeshStandardMaterial({
    color: 0x59f4ff,
    emissive: 0x143847,
    metalness: 0.7,
    roughness: 0.28
  });

  const chassis = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.66, 1.34), body);
  group.add(chassis);

  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.45, 20), body);
  nose.rotation.z = -Math.PI / 2;
  nose.position.set(3.05, 0.02, 0);
  group.add(nose);

  const cockpit = new THREE.Mesh(new THREE.CapsuleGeometry(0.38, 0.9, 8, 16), accent);
  cockpit.rotation.z = Math.PI / 2;
  cockpit.position.set(0.24, 0.4, 0);
  group.add(cockpit);

  const frontWing = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.16, 2.85), accent);
  frontWing.position.set(2.65, -0.24, 0);
  group.add(frontWing);

  const rearWing = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.05, 2.75), body);
  rearWing.position.set(-2.2, 0.5, 0);
  group.add(rearWing);

  const wheelGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.42, 30);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x161616, roughness: 0.78, metalness: 0.15 });
  const positions = [
    [1.7, -0.45, 1.03],
    [1.7, -0.45, -1.03],
    [-1.5, -0.45, 1.03],
    [-1.5, -0.45, -1.03]
  ];

  for (const [x, y, z] of positions) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(x, y, z);
    group.add(wheel);
  }

  group.position.y = -0.2;
  return group;
}

function createNeuralNetworkHero() {
  const group = new THREE.Group();
  const layers = [8, 11, 14, 11, 8];
  const xPos = [-5.2, -2.8, 0, 2.8, 5.2];
  const layerNodes = [];

  layers.forEach((count, layerIndex) => {
    const nodes = [];
    for (let i = 0; i < count; i += 1) {
      const y = -0.4 + (i / (count - 1)) * 4.1;
      const z = Math.sin(i * 0.72 + layerIndex) * 2.1;
      const node = new THREE.Mesh(
        new THREE.SphereGeometry(layerIndex === 2 ? 0.1 : 0.075, 12, 12),
        new THREE.MeshBasicMaterial({
          color: layerIndex % 2 === 0 ? 0x59f4ff : 0x58ff9a,
          transparent: true,
          opacity: 0.82
        })
      );
      node.position.set(xPos[layerIndex], y, z);
      nodes.push(node);
      group.add(node);
    }
    layerNodes.push(nodes);
  });

  const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x6cbfff, transparent: true, opacity: 0.18 });
  const edges = [];

  for (let l = 0; l < layerNodes.length - 1; l += 1) {
    const left = layerNodes[l];
    const right = layerNodes[l + 1];
    left.forEach((a, i) => {
      right.forEach((b, j) => {
        if ((i + j) % 3 !== 0) {
          return;
        }
        const line = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints([a.position.clone(), b.position.clone()]),
          edgeMaterial
        );
        group.add(line);
        edges.push(line);
      });
    });
  }

  const activePath = [
    layerNodes[0][4],
    layerNodes[1][5],
    layerNodes[2][7],
    layerNodes[3][5],
    layerNodes[4][4]
  ];

  const pathMaterial = new THREE.LineBasicMaterial({ color: 0x58ff9a, transparent: true, opacity: 0.8 });
  const pathLine = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(activePath.map((n) => n.position.clone())),
    pathMaterial
  );
  group.add(pathLine);

  const pathPulse = new THREE.Mesh(
    new THREE.SphereGeometry(0.11, 14, 14),
    new THREE.MeshBasicMaterial({ color: 0xffcf6d, transparent: true, opacity: 0.95 })
  );
  group.add(pathPulse);

  group.position.y = 0.35;
  return { group, layerNodes, edges, pathLine, pathPulse, activePath };
}

function createDataFlows() {
  const group = new THREE.Group();
  const flows = [];
  const colors = [0x59f4ff, 0x58ff9a, 0xffcf6d];

  colors.forEach((color, idx) => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-7.2, 2.4 - idx * 0.4, -2.4 + idx * 1.1),
      new THREE.Vector3(-4.8, 2.8 + idx * 0.2, -1.4 + idx * 0.7),
      new THREE.Vector3(-2.6, 2.1 + idx * 0.2, -0.4 + idx * 0.3),
      new THREE.Vector3(-0.8, 1.8 + idx * 0.16, 0.3 + idx * 0.2),
      new THREE.Vector3(1.6, 1.7 + idx * 0.18, 1.1 - idx * 0.35)
    ]);

    const trace = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(curve.getPoints(120)),
      new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.22 })
    );
    group.add(trace);

    const pulse = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 12, 12),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 })
    );
    group.add(pulse);

    flows.push({ curve, pulse, offset: Math.random() });
  });

  return { group, flows };
}

function initializeUi() {
  const telemetryCards = [];

  TELEMETRY_GROUPS.forEach((group) => {
    const section = document.createElement("section");
    section.className = "telemetry-group";

    const header = document.createElement("h3");
    header.textContent = group.title;
    section.append(header);

    group.metrics.forEach((metric) => {
      const card = document.createElement("article");
      card.className = "metric-card";
      card.innerHTML = `
        <div class="metric-head">
          <span class="metric-icon">${metric.icon}</span>
          <span class="metric-name">${metric.label}</span>
        </div>
        <div class="metric-value" style="color:${metric.color}">--</div>
        <canvas class="sparkline" width="220" height="36"></canvas>
      `;

      section.append(card);
      telemetryCards.push({
        key: metric.key,
        unit: metric.unit,
        min: metric.min,
        max: metric.max,
        color: metric.color,
        valueEl: card.querySelector(".metric-value"),
        sparkCanvas: card.querySelector(".sparkline"),
        sparkCtx: card.querySelector(".sparkline").getContext("2d")
      });
    });

    telemetryGroupsEl.append(section);
  });

  const decisionCards = [];
  for (let i = 0; i < 3; i += 1) {
    const card = document.createElement("article");
    card.className = "decision-card";
    card.innerHTML = `
      <div class="decision-head">
        <span class="decision-title">--</span>
        <span class="decision-value">--</span>
      </div>
      <div class="decision-metrics">
        <div class="progress-wrap"><div class="progress-fill"></div></div>
        <div class="confidence-ring"><span>0%</span></div>
      </div>
    `;
    decisionCardsEl.append(card);

    decisionCards.push({
      root: card,
      titleEl: card.querySelector(".decision-title"),
      valueEl: card.querySelector(".decision-value"),
      fillEl: card.querySelector(".progress-fill"),
      ringEl: card.querySelector(".confidence-ring"),
      ringTextEl: card.querySelector(".confidence-ring span")
    });
  }

  const factorRows = [];
  for (let i = 0; i < 3; i += 1) {
    const row = document.createElement("li");
    row.className = "factor-row";
    row.innerHTML = `
      <span class="factor-name">--</span>
      <div class="factor-bar"><div class="factor-bar-fill"></div></div>
      <span class="factor-value">0%</span>
    `;
    explainabilityListEl.append(row);

    factorRows.push({
      nameEl: row.querySelector(".factor-name"),
      barEl: row.querySelector(".factor-bar-fill"),
      valueEl: row.querySelector(".factor-value")
    });
  }

  const alertRows = ["Engine Risk", "Collision Risk"].map((title) => {
    const chip = document.createElement("div");
    chip.className = "alert-chip";
    chip.innerHTML = `<strong>${title}</strong><span>--</span>`;
    alertListEl.append(chip);
    return { chip, label: chip.querySelector("strong"), valueEl: chip.querySelector("span") };
  });

  const nnRows = NN_LABEL_KEYS.map((item) => {
    const li = document.createElement("li");
    li.className = "nn-label";
    li.innerHTML = `<span>${item.label}</span><strong>0%</strong>`;
    nnLabelsEl.append(li);
    return { key: item.key, valueEl: li.querySelector("strong"), root: li };
  });

  return { telemetryCards, decisionCards, factorRows, alertRows, nnRows };
}

function animate() {
  requestAnimationFrame(animate);

  const elapsed = clock.getElapsedTime();
  const timeMs = elapsed * 1000;

  const telemetry = generateTelemetryState(timeMs);
  const intel = generateIntelligenceState(timeMs, telemetry);

  carMotion(elapsed);
  networkMotion(elapsed, intel);
  flowMotion(elapsed);
  updateNeuralOverlay(elapsed, intel);

  updateTelemetryUi(telemetry);
  updateDecisionUi(intel);
  updateExplainabilityUi(intel);
  updateAlertsUi(intel);
  updateNeuralLabelsUi(intel);
  updateMetaUi(intel);
  updateTimelineUi(intel, telemetry);

  renderer.render(scene, camera);
}

function carMotion(elapsed) {
  car.rotation.y = Math.sin(elapsed * 0.34) * 0.16;
  car.position.y = -0.2 + Math.sin(elapsed * 0.95) * 0.04;
}

function networkMotion(elapsed, intel) {
  network.group.rotation.y = elapsed * 0.08;

  const pulseT = (elapsed * 0.42) % 1;
  const pulsePoint = new THREE.CatmullRomCurve3(network.activePath.map((n) => n.position.clone())).getPointAt(pulseT);
  network.pathPulse.position.copy(pulsePoint);

  const attention = intel.nnLabels.transformerAttention / 100;
  network.pathLine.material.opacity = 0.55 + attention * 0.4;

  network.layerNodes.forEach((layer, i) => {
    layer.forEach((node, j) => {
      const k = 0.64 + Math.sin(elapsed * 1.4 + i * 0.7 + j * 0.15) * 0.3;
      node.material.opacity = 0.45 + k * 0.5;
    });
  });
}

function flowMotion(elapsed) {
  dataFlows.flows.forEach((flow, index) => {
    const t = (elapsed * 0.18 + flow.offset + index * 0.09) % 1;
    const pos = flow.curve.getPointAt(t);
    flow.pulse.position.copy(pos);
    flow.pulse.scale.setScalar(0.65 + Math.sin((t + elapsed) * Math.PI * 3) * 0.2);
  });
}

function updateTelemetryUi(telemetry) {
  ui.telemetryCards.forEach((card) => {
    const value = telemetry[card.key];
    const decimals = card.unit === "rpm" ? 0 : card.unit === "km/h" ? 1 : 1;
    card.valueEl.textContent = `${value.toFixed(decimals)} ${card.unit}`;

    const history = sparkHistory.get(card.key) || [];
    history.push(value);
    if (history.length > 42) {
      history.shift();
    }
    sparkHistory.set(card.key, history);

    drawSparkline(
      card.sparkCtx,
      card.sparkCanvas.clientWidth,
      card.sparkCanvas.clientHeight,
      history,
      card.color,
      card.min,
      card.max
    );
  });
}

function updateDecisionUi(intel) {
  ui.decisionCards.forEach((card, index) => {
    const decision = intel.decisions[index];
    card.titleEl.textContent = decision.title;
    card.valueEl.textContent = decision.value;
    card.fillEl.style.width = `${decision.score.toFixed(1)}%`;

    const ring = Math.max(0, Math.min(100, decision.confidence));
    card.ringEl.style.background = `conic-gradient(#58ff9a ${ring * 3.6}deg, rgba(255,255,255,0.1) 0deg)`;
    card.ringTextEl.textContent = `${ring.toFixed(0)}%`;
  });

  const statusText = `${intel.activePlan} ACTIVE | Pit Window: ${intel.pitWindow} | Pred Lap ${intel.predictedLap.toFixed(2)}s`;
  systemStatusEl.textContent = statusText;
  activePathEl.textContent = `Active Path: ${intel.activePlan}`;
}

function updateExplainabilityUi(intel) {
  ui.factorRows.forEach((row, index) => {
    const factor = intel.factors[index];
    row.nameEl.textContent = factor.name;
    row.barEl.style.width = `${factor.importance.toFixed(1)}%`;
    row.valueEl.textContent = `${factor.importance.toFixed(1)}%`;
  });
}

function updateAlertsUi(intel) {
  ui.alertRows.forEach((row, index) => {
    const alert = intel.alerts[index];
    row.label.textContent = `${alert.title} WARN`;
    row.valueEl.textContent = `${alert.level.toFixed(1)}%`;
    row.chip.style.boxShadow = `0 0 ${8 + alert.level * 0.08}px rgba(255, 207, 109, 0.25)`;
  });
}

function updateNeuralLabelsUi(intel) {
  ui.nnRows.forEach((row) => {
    const value = intel.nnLabels[row.key];
    row.valueEl.textContent = `${value.toFixed(1)}%`;
    row.root.style.borderColor = value > 65 ? "rgba(88, 255, 154, 0.45)" : "rgba(89, 244, 255, 0.28)";
  });
}

function updateMetaUi(intel) {
  simCountEl.textContent = `${intel.simulations} Simulations Running`;
  mlopsEl.textContent = `Model ${intel.modelVersion} LIVE | Latency ${intel.latencyMs}ms`;
}

function updateTimelineUi(intel, telemetry) {
  timelineHistory.push({
    lapTime: telemetry.lapTime,
    predictedLap: intel.predictedLap
  });

  if (timelineHistory.length > HISTORY_LIMIT) {
    timelineHistory.shift();
  }

  const width = timelineCanvas.clientWidth;
  const height = timelineCanvas.clientHeight;

  timelineCtx.clearRect(0, 0, width, height);

  timelineCtx.fillStyle = "rgba(89, 244, 255, 0.08)";
  timelineCtx.fillRect(0, height * 0.54, width, 18);

  const lapCount = 58;
  const currentLap = intel.timeline.currentLap;

  for (let lap = 1; lap <= lapCount; lap += 1) {
    const x = (lap / lapCount) * width;

    if (lap < currentLap) {
      timelineCtx.fillStyle = "rgba(255,255,255,0.08)";
      timelineCtx.fillRect(x - 3, height * 0.54, 2, 18);
    }

    if (lap === currentLap) {
      timelineCtx.fillStyle = "#59f4ff";
      timelineCtx.fillRect(x - 2, height * 0.5, 4, 26);
    }
  }

  const pitStartX = (intel.timeline.pitStart / lapCount) * width;
  const pitEndX = (intel.timeline.pitEnd / lapCount) * width;
  timelineCtx.fillStyle = "rgba(88, 255, 154, 0.35)";
  timelineCtx.fillRect(pitStartX, height * 0.5, pitEndX - pitStartX, 26);

  intel.timeline.events.forEach((event) => {
    const x = (event.lap / lapCount) * width;
    timelineCtx.fillStyle = "#ffcf6d";
    timelineCtx.beginPath();
    timelineCtx.arc(x, height * 0.42, 3.5, 0, Math.PI * 2);
    timelineCtx.fill();
    timelineCtx.fillStyle = "rgba(230, 240, 255, 0.8)";
    timelineCtx.font = "10px Segoe UI";
    timelineCtx.fillText(event.type, x - 11, height * 0.32);
  });

  drawTimelineSeries(timelineHistory.map((x) => x.lapTime), "#76a9ff", 74.2, 95.2, width, height * 0.42);
  drawTimelineSeries(timelineHistory.map((x) => x.predictedLap), "#58ff9a", 74.2, 95.2, width, height * 0.42);
}

function drawTimelineSeries(values, color, min, max, width, chartHeight) {
  if (values.length < 2) {
    return;
  }

  timelineCtx.beginPath();
  timelineCtx.strokeStyle = color;
  timelineCtx.lineWidth = 1.6;

  values.forEach((value, idx) => {
    const x = (idx / (HISTORY_LIMIT - 1)) * width;
    const n = (value - min) / (max - min);
    const y = chartHeight - n * (chartHeight - 10) + 2;
    if (idx === 0) {
      timelineCtx.moveTo(x, y);
    } else {
      timelineCtx.lineTo(x, y);
    }
  });

  timelineCtx.stroke();
}

function drawSparkline(ctx, width, height, values, color, min, max) {
  ctx.clearRect(0, 0, width, height);
  if (values.length < 2) {
    return;
  }

  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.6;

  values.forEach((value, idx) => {
    const x = (idx / (values.length - 1)) * width;
    const n = (value - min) / (max - min);
    const y = height - n * (height - 6) - 3;
    if (idx === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });

  ctx.stroke();
}

function createNeuralOverlay() {
  const svgNs = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNs, "svg");
  nnGraphEl.append(svg);

  const layers = [
    { x: 0.1, count: 5, cls: "input" },
    { x: 0.32, count: 7, cls: "hidden" },
    { x: 0.52, count: 8, cls: "hidden" },
    { x: 0.72, count: 7, cls: "hidden" },
    { x: 0.9, count: 4, cls: "output" }
  ];

  const nodes = [];
  const edges = [];

  layers.forEach((layer, layerIndex) => {
    const layerNodes = [];
    for (let i = 0; i < layer.count; i += 1) {
      const node = document.createElementNS(svgNs, "circle");
      node.setAttribute("class", `nn-node-dot ${layer.cls}`);
      node.setAttribute("r", layer.cls === "output" ? "5" : "4");
      svg.append(node);
      layerNodes.push(node);
    }
    nodes.push(layerNodes);
    if (layerIndex > 0) {
      nodes[layerIndex - 1].forEach((leftNode, li) => {
        layerNodes.forEach((rightNode, ri) => {
          if ((li + ri) % 2 !== 0) {
            return;
          }
          const line = document.createElementNS(svgNs, "line");
          line.setAttribute("class", "nn-edge-line");
          svg.insertBefore(line, svg.firstChild);
          edges.push({ line, from: { layer: layerIndex - 1, idx: li }, to: { layer: layerIndex, idx: ri } });
        });
      });
    }
  });

  const activePath = [
    { layer: 0, idx: 2 },
    { layer: 1, idx: 3 },
    { layer: 2, idx: 4 },
    { layer: 3, idx: 3 },
    { layer: 4, idx: 2 }
  ];

  const pulse = document.createElementNS(svgNs, "circle");
  pulse.setAttribute("r", "5.5");
  pulse.setAttribute("fill", "rgba(255, 207, 109, 0.95)");
  svg.append(pulse);

  function layout() {
    const width = nnGraphEl.clientWidth;
    const height = nnGraphEl.clientHeight;
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

    layers.forEach((layer, layerIndex) => {
      const x = layer.x * width;
      nodes[layerIndex].forEach((node, idx) => {
        const y = ((idx + 1) / (layer.count + 1)) * height;
        node.setAttribute("cx", x.toFixed(2));
        node.setAttribute("cy", y.toFixed(2));
      });
    });

    edges.forEach((edge) => {
      const from = nodes[edge.from.layer][edge.from.idx];
      const to = nodes[edge.to.layer][edge.to.idx];
      edge.line.setAttribute("x1", from.getAttribute("cx"));
      edge.line.setAttribute("y1", from.getAttribute("cy"));
      edge.line.setAttribute("x2", to.getAttribute("cx"));
      edge.line.setAttribute("y2", to.getAttribute("cy"));
    });

    edges.forEach((edge) => {
      const active = activePath.some((p, idx) => {
        if (idx === activePath.length - 1) {
          return false;
        }
        const next = activePath[idx + 1];
        return p.layer === edge.from.layer && p.idx === edge.from.idx && next.layer === edge.to.layer && next.idx === edge.to.idx;
      });
      edge.line.classList.toggle("active", active);
    });
  }

  layout();
  return { svg, nodes, activePath, pulse, layout };
}

function updateNeuralOverlay(elapsed, intel) {
  const path = neuralOverlay.activePath;
  const t = (elapsed * 0.42) % 1;
  const segment = Math.min(path.length - 2, Math.floor(t * (path.length - 1)));
  const local = t * (path.length - 1) - segment;
  const a = path[segment];
  const b = path[segment + 1];
  const aNode = neuralOverlay.nodes[a.layer][a.idx];
  const bNode = neuralOverlay.nodes[b.layer][b.idx];

  const ax = Number(aNode.getAttribute("cx"));
  const ay = Number(aNode.getAttribute("cy"));
  const bx = Number(bNode.getAttribute("cx"));
  const by = Number(bNode.getAttribute("cy"));

  neuralOverlay.pulse.setAttribute("cx", String(ax + (bx - ax) * local));
  neuralOverlay.pulse.setAttribute("cy", String(ay + (by - ay) * local));

  const intensity = intel.nnLabels.transformerAttention / 100;
  neuralOverlay.svg.style.filter = `drop-shadow(0 0 ${8 + intensity * 10}px rgba(89, 244, 255, 0.28))`;
}

function applyPerformanceMode() {
  const mode = perfModeSelect.value;

  if (mode === "high") {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMappingExposure = 1.05;
  }

  if (mode === "medium") {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.toneMappingExposure = 1.0;
  }

  if (mode === "low") {
    renderer.setPixelRatio(1);
    renderer.toneMappingExposure = 0.95;
  }

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  neuralOverlay.layout();
  resizeSparklineCanvases();
  resizeTimelineCanvas();
}

function resizeSparklineCanvases() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  ui.telemetryCards.forEach((card) => {
    const width = Math.max(1, Math.floor(card.sparkCanvas.clientWidth));
    const height = Math.max(1, Math.floor(card.sparkCanvas.clientHeight));
    card.sparkCanvas.width = Math.floor(width * dpr);
    card.sparkCanvas.height = Math.floor(height * dpr);
    card.sparkCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  });
}

function resizeTimelineCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(1, Math.floor(timelineCanvas.clientWidth));
  const height = Math.max(1, Math.floor(timelineCanvas.clientHeight));
  timelineCanvas.width = Math.floor(width * dpr);
  timelineCanvas.height = Math.floor(height * dpr);
  timelineCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
