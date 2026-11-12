(() => {
"use strict";

const root = document.getElementById("knn-inline-lab");
const byId = (id) => root.querySelector("#" + id);
const plot = byId("plot");
const dataset = byId("dataset");
const k = byId("k");
const classCount = byId("class-count");
const metric = byId("metric");
const showBoundary = byId("show-boundary");
const classes = {
  A: { color: "#087f9a", shape: "circle" },
  B: { color: "#a94e19", shape: "square" },
  C: { color: "#7345a6", shape: "triangle" },
  D: { color: "#267449", shape: "diamond" },
  E: { color: "#b23960", shape: "hexagon" },
};
const defaultPoint = { x: 4.8, y: 3.1 };
const challengePoint = { x: 5, y: 3 };
let testPoint = { ...defaultPoint };
let challengeActive = false;

function labeled(...groups) {
  const labels = Object.keys(classes);
  return groups.flatMap((points, index) => points.map(([x, y]) => ({ x, y, label: labels[index] })));
}

function cluster(x, y, spread) {
  const offsets = [[-.8,.1],[-.65,-.55],[-.5,.57],[-.2,-.18],[-.02,.76],
    [.1,-.72],[.28,.3],[.43,-.22],[.52,.6],[.72,-.47],[.87,.02],[.16,.02]];
  return offsets.map(([dx, dy]) => [x + dx * spread, y + dy * spread]);
}

function ring(count, radius, phase) {
  return Array.from({ length: count }, (_, i) => {
    const angle = i * 2 * Math.PI / count + phase;
    return [5 + radius * Math.cos(angle), 3 + radius * Math.sin(angle)];
  });
}

const datasets = {
  clusters: labeled(
    [[1,1.5],[1.4,3.2],[1.6,4.4],[2,2.4],[2.1,3.8],[2.5,1.3],[2.7,2.9],[2.9,4.7],[3.1,3.7],[3.5,2],[3.8,4.1],[3.9,2.8],[4.25,3.6],[4.5,2.55]],
    [[5.1,3.8],[5.45,2.75],[5.8,4.5],[6.3,2],[6.5,3.15],[6.8,4.1],[7.05,2.65],[7.45,4.75],[7.6,3.5],[7.9,1.65],[8.1,2.8],[8.55,4.1],[8.8,3],[9,4.8]],
    cluster(5.2, 5.25, .7), cluster(4.8, .85, .7), cluster(8.8, .9, .65)
  ),
  overlap: labeled(
    [[1.2,1.4],[1.6,2.8],[1.9,4.1],[2.4,3.4],[2.6,1.1],[2.8,2.1],[3.3,4.4],[3.6,2.75],[4.1,3.8],[4.4,1.5],[4.8,3.05],[5.3,3.15],[5.6,4.7],[6.7,2]],
    [[3.5,5.2],[4.3,2.35],[4.55,3.52],[5.05,2.77],[5.65,2.84],[5.9,3.8],[6.1,1.15],[6.5,4.4],[6.95,3.35],[7.2,2.5],[7.75,4.6],[8.1,2.1],[8.4,3.7],[8.9,4.3]],
    cluster(4.3, 4.65, 1.4), cluster(5.5, 1.45, 1.5), cluster(6.8, 3.25, 1.7)
  ),
  rings: labeled(ring(12, 1.05, .17), ring(18, 2.45, .08),
    ring(14, 1.76, .22), ring(8, .42, .41), ring(12, 2.87, .12)),
};

function selectedLabels() {
  return Object.keys(classes).slice(0, Number(classCount.value));
}

function trainingData(labels) {
  return datasets[dataset.value].filter(({ label }) => labels.includes(label));
}

function classify(point, data, count, distanceMetric) {
  const neighbors = data.map((sample) => {
    const dx = sample.x - point.x;
    const dy = sample.y - point.y;
    const distance = distanceMetric === "manhattan" ? Math.abs(dx) + Math.abs(dy) : Math.hypot(dx, dy);
    return { sample, distance };
  }).sort((first, second) => first.distance - second.distance).slice(0, count);
  const votes = {};
  for (const { sample } of neighbors) {
    votes[sample.label] = (votes[sample.label] ?? 0) + 1;
  }
  const winningVotes = Math.max(...Object.values(votes));
  const tied = Object.values(votes).filter((vote) => vote === winningVotes).length > 1;
  const winner = neighbors.find(({ sample }) => votes[sample.label] === winningVotes).sample.label;
  return { neighbors, votes, winner, winningVotes, tied };
}

const xPixel = (x) => 40 + x * 55;
const yPixel = (y) => 350 - y * 55;
const svgNS = "http://www.w3.org/2000/svg";

function draw(parent, tag, attrs, content) {
  const element = document.createElementNS(svgNS, tag);
  Object.entries(attrs).forEach(([key, value]) => element.setAttribute(key, value));
  if (content !== undefined) element.textContent = content;
  parent.append(element);
}

const axes = byId("axes");
for (let x = 0; x <= 10; x += 1) {
  draw(axes, "text", { x: xPixel(x), y: 370, "text-anchor": "middle", fill: "#526779", "font-size": 12 }, x);
}
for (let y = 1; y <= 6; y += 1) {
  draw(axes, "text", { x: 30, y: yPixel(y) + 4, "text-anchor": "end", fill: "#526779", "font-size": 12 }, y);
}

function renderBoundary(data, labels) {
  const boundary = byId("boundary");
  boundary.replaceChildren();
  if (!showBoundary.checked) return;
  const paths = Object.fromEntries(labels.map((label) => [label, ""]));
  const resolution = 5;
  const tile = 55 / resolution;
  for (let row = 0; row < 6 * resolution; row += 1) {
    for (let column = 0; column < 10 * resolution; column += 1) {
      const x = (column + .5) / resolution;
      const y = 6 - (row + .5) / resolution;
      const { winner } = classify({ x, y }, data, +k.value, metric.value);
      paths[winner] += `M${40 + column * tile} ${20 + row * tile}h${tile}v${tile}h-${tile}z`;
    }
  }
  for (const [label, path] of Object.entries(paths)) {
    draw(boundary, "path", { d: path, fill: classes[label].color, opacity: .13 });
  }
}

function classSwatch(label) {
  const swatch = document.createElement("i");
  swatch.className = `swatch ${classes[label].shape}`;
  swatch.style.backgroundColor = classes[label].color;
  return swatch;
}

function renderLegend(labels) {
  const legend = byId("legend");
  legend.replaceChildren();
  for (const label of labels) {
    const entry = document.createElement("span");
    entry.append(classSwatch(label), `Class ${label}`);
    legend.append(entry);
  }
  for (const [icon, text] of [["diamond", "Test point"], ["dash", "Nearest neighbor"]]) {
    const entry = document.createElement("span");
    const marker = document.createElement("i");
    marker.className = icon;
    entry.append(marker, text);
    legend.append(entry);
  }
}

function drawSample(parent, x, y, label) {
  const { color, shape } = classes[label];
  const style = { fill: color, stroke: "white" };
  if (shape === "circle") {
    draw(parent, "circle", { cx: x, cy: y, r: 5.7, ...style });
  } else if (shape === "square") {
    draw(parent, "rect", { x: x - 5.3, y: y - 5.3, width: 10.6, height: 10.6, rx: 2, ...style });
  } else {
    const shapes = {
      triangle: [[0,-7],[6.5,5],[-6.5,5]],
      diamond: [[0,-7],[6,0],[0,7],[-6,0]],
      hexagon: [[-3,-5.5],[3,-5.5],[6,0],[3,5.5],[-3,5.5],[-6,0]],
    };
    const points = shapes[shape].map(([dx, dy]) => `${x + dx},${y + dy}`).join(" ");
    draw(parent, "polygon", { points, ...style });
  }
}

function render(updateBoundary = false) {
  const labels = selectedLabels();
  const data = trainingData(labels);
  if (updateBoundary) {
    k.max = Math.min(15, data.length);
    byId("k-max").textContent = k.max;
    byId("k-mid").textContent = Math.ceil((1 + Number(k.max)) / 2);
    renderLegend(labels);
    renderBoundary(data, labels);
  }
  const { neighbors, votes, winner, winningVotes, tied } = classify(testPoint, data, +k.value, metric.value);
  const marks = byId("marks");
  const selected = new Set(neighbors.map(({ sample }) => sample));
  marks.replaceChildren();
  const px = xPixel(testPoint.x);
  const py = yPixel(testPoint.y);
  for (const { sample } of neighbors) {
    const x = xPixel(sample.x);
    const y = yPixel(sample.y);
    const path = metric.value === "manhattan" ? `M${px} ${py}H${x}V${y}` : `M${px} ${py}L${x} ${y}`;
    draw(marks, "path", { d: path, fill: "none", stroke: "#506879", "stroke-width": 1.5, "stroke-dasharray": "4 4", opacity: .85 });
  }
  for (const sample of data) {
    const x = xPixel(sample.x);
    const y = yPixel(sample.y);
    if (selected.has(sample)) {
      draw(marks, "circle", { cx: x, cy: y, r: 10.5, fill: "#fff", stroke: classes[sample.label].color, "stroke-width": 1.25 });
    }
    drawSample(marks, x, y, sample.label);
  }
  draw(marks, "rect", { x: px - 8, y: py - 8, width: 16, height: 16, rx: 2, fill: "#183149", stroke: "white", "stroke-width": 2, transform: `rotate(45 ${px} ${py})` });
  draw(marks, "text", { x: px, y: py + 3.4, "text-anchor": "middle", fill: "white", "font-size": 10, "font-weight": 700 }, "?");

  byId("k-value").textContent = `k = ${k.value}`;
  byId("prediction").textContent = `Prediction: Class ${winner}`;
  byId("prediction").style.color = classes[winner].color;
  const track = byId("vote-track");
  const counts = byId("vote-counts");
  track.replaceChildren();
  counts.replaceChildren();
  for (const label of labels) {
    const count = votes[label] ?? 0;
    const segment = document.createElement("div");
    segment.style.width = `${count / neighbors.length * 100}%`;
    segment.style.backgroundColor = classes[label].color;
    track.append(segment);
    const entry = document.createElement("span");
    entry.append(classSwatch(label), `Class ${label} · ${count}`);
    counts.append(entry);
  }
  byId("explanation").textContent = tied
    ? `The top classes tied at ${winningVotes} votes. Class ${winner} wins because it has the closest neighbor among those classes.`
    : `${winningVotes} of the ${neighbors.length} closest neighbors voted for Class ${winner}.`;
}

function movePoint(x, y) {
  testPoint = { x: Math.min(10, Math.max(0, x)), y: Math.min(6, Math.max(0, y)) };
  render();
}

plot.addEventListener("click", (event) => {
  const transform = plot.getScreenCTM();
  if (!transform) return;
  const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(transform.inverse());
  if (point.x >= 40 && point.x <= 590 && point.y >= 20 && point.y <= 350) {
    movePoint((point.x - 40) / 55, (350 - point.y) / 55);
  }
});

const arrowSteps = { ArrowLeft: [-.15, 0], ArrowRight: [.15, 0], ArrowDown: [0, -.15], ArrowUp: [0, .15] };
plot.addEventListener("keydown", (event) => {
  if (!Object.hasOwn(arrowSteps, event.key)) return;
  event.preventDefault();
  const [dx, dy] = arrowSteps[event.key];
  movePoint(testPoint.x + dx, testPoint.y + dy);
});

for (const control of [classCount, dataset, k, metric, showBoundary]) {
  control.addEventListener("input", () => render(true));
}

function loadExample(name, count, point) {
  dataset.value = name;
  classCount.value = "2";
  k.max = 15;
  k.value = count;
  metric.value = "euclidean";
  showBoundary.checked = false;
  testPoint = { ...point };
  render(true);
}

byId("reset").addEventListener("click", () => {
  challengeActive = false;
  byId("quiz").hidden = true;
  byId("feedback").textContent = "";
  loadExample("clusters", 5, defaultPoint);
});

function focusPlot() {
  byId("lab").scrollIntoView({ block: "start" });
  plot.focus({ preventScroll: true });
}

byId("load").addEventListener("click", () => {
  challengeActive = true;
  byId("quiz").hidden = false;
  byId("feedback").textContent = "";
  loadExample("overlap", 3, challengePoint);
  focusPlot();
});

root.querySelectorAll("[data-guess]").forEach((button) => {
  button.addEventListener("click", () => {
    if (!challengeActive) return;
    const { votes, winner } = classify(challengePoint, datasets.overlap.filter(({ label }) => label === "A" || label === "B"), 5, "euclidean");
    loadExample("overlap", 5, challengePoint);
    const outcome = button.dataset.guess === winner ? "Correct." : `The prediction is Class ${winner}.`;
    byId("feedback").textContent = `${outcome} At k = 5, Class A gets ${votes.A ?? 0} votes and Class B gets ${votes.B ?? 0}. The graph now shows all five neighbors.`;
  });
});

function markNavigation() {
  const target = location.hash || "#lab";
  root.querySelectorAll("nav a").forEach((link) => {
    const current = link.hash === target || (target === "#top" && link.hash === "#lab");
    link.classList.toggle("active", current);
    if (current) link.setAttribute("aria-current", "location");
    else link.removeAttribute("aria-current");
  });
}
window.addEventListener("hashchange", markNavigation);
markNavigation();
render(true);
})();
