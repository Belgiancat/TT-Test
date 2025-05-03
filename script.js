const results = document.querySelector("#result");
const recordBtn = document.querySelector("#record");
const toggleBtn = document.querySelector("#toggle");
const resetBtn = document.querySelector("#reset");

let data = {};
const posList = [];            // recorded points with distances
let solutions = [];           // stores the two intersection solutions
let currentSolutionIndex = 0;  // which solution is currently displayed

// --- vector helper functions ---
function vecSub(a, b) { return { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z }; }
function vecAdd(v1, v2) { return { x: v1.x + v2.x, y: v1.y + v2.y, z: v1.z + v2.z }; }
function vecScale(v, s) { return { x: v1.x * s, y: v1.y * s, z: v1.z * s }; }
function vecDot(v1, v2) { return v1.x * v2.x + v1.y * v2.y + v1.z * v2.z; }
function vecCross(v1, v2) {
  return {
    x: v1.y * v2.z - v1.z * v2.y,
    y: v1.z * v2.x - v1.x * v2.z,
    z: v1.x * v2.y - v1.y * v2.x
  };
}
function vecLength(v) { return Math.sqrt(vecDot(v, v)); }
function vecNormalize(v) { const len = vecLength(v); return vecScale(v, 1 / len); }

// message listener to get pos_x, pos_y, pos_z
window.addEventListener("message", (event) => {
  if (!Array.isArray(event.data.data)) {
    data = { ...data, ...event.data.data };
  }
});

// request named data from parent
window.addEventListener("load", () => {
  window.parent.postMessage({ type: "getNamedData", keys: ["pos_x", "pos_y", "pos_z"] }, "*");
});

// record current point + distance
recordBtn.addEventListener("click", () => {
  const distance = parseFloat(document.querySelector("#distance").value);
  posList.push({ x: data.pos_x, y: data.pos_y, z: data.pos_z, d: distance });
  results.innerHTML = `Recorded ${posList.length} points.`;
  if (posList.length >= 3) {
    computeSolutions();
  }
});

// toggle between the two waypoint solutions
toggleBtn.addEventListener("click", () => {
  if (solutions.length < 2) return;
  currentSolutionIndex = 1 - currentSolutionIndex;
  displaySolution(currentSolutionIndex);
});

// reset everything (points, solutions, UI)
resetBtn.addEventListener("click", () => {
  posList.length = 0;
  solutions = [];
  currentSolutionIndex = 0;
  toggleBtn.disabled = true;
  results.innerHTML = "Reset all recorded points and solutions.";
});

// main computation: trilateration with two z-roots, degenerate checks, error tolerance
function computeSolutions() {
  const [s1, s2, s3] = posList;

  // 1) build orthonormal basis
  const rawEx = vecSub(s1, s2);
  const d = vecLength(rawEx);
  if (d < 1e-6) {
    results.innerHTML = "Points s1 and s2 are too close or identical.";
    return;
  }
  const ex = vecNormalize(rawEx);

  const s1to3 = vecSub(s1, s3);
  const i = vecDot(ex, s1to3);
  const orthToEx = vecSub(s1to3, vecScale(ex, i));
  const eyLength = vecLength(orthToEx);
  if (eyLength < 1e-6) {
    results.innerHTML = "Points are nearly colinear—please record a different third point.";
    posList.length = 0;
    return;
  }
  const ey = vecNormalize(orthToEx);
  const ez = vecCross(ex, ey);
  const j = vecDot(ey, s1to3);

  // 2) solve for local coords x, y, z
  const r1 = s1.d, r2 = s2.d, r3 = s3.d;
  const x = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
  const y = (r1 * r1 - r3 * r3 + i * i + j * j - 2 * i * x) / (2 * j);

  const z2 = r1 * r1 - x * x - y * y;
  if (z2 < 0) {
    results.innerHTML = "No real intersection (inconsistent distances).";
    posList.length = 0;
    return;
  }

  // two possible z-roots
  const zPos = Math.sqrt(z2);
  const zNeg = -zPos;

  // build both world-space solutions
  const solA = vecAdd(vecAdd(s1, vecScale(ex, x)), vecAdd(vecScale(ey, y), vecScale(ez, zPos)));
  const solB = vecAdd(vecAdd(s1, vecScale(ex, x)), vecAdd(vecScale(ey, y), vecScale(ez, zNeg)));

  solutions = [solA, solB];
  currentSolutionIndex = 0;
  toggleBtn.disabled = false;
  displaySolution(0);
}

// display solution[index] in UI and postMessage
function displaySolution(index) {
  const p = solutions[index];
  results.innerHTML = `Solution ${index + 1}: ${JSON.stringify(p)}`;
  window.parent.postMessage({ type: "setWaypoint", ...p }, "*");
}
