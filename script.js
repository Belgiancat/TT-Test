const results = document.querySelector("#result");
const distanceInput = document.querySelector("#distance");
const recordBtn = document.querySelector("#record");
const toggleBtn = document.querySelector("#toggle");
const resetBtn = document.querySelector("#reset");

let data = {}; // keep last known position until new measurement arrives; do not clear data here
const posList = [];        // stored measurements: { x,y,z,d }
let solutions = [];        // two possible intersection points
let currentSolutionIndex = 0;

// — Vector operations —
function vecSub(a, b) { return { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z }; }
function vecAdd(v1, v2) { return { x: v1.x + v2.x, y: v1.y + v2.y, z: v1.z + v2.z }; }
function vecScale(v, s) { return { x: v.x * s, y: v.y * s, z: v.z * s }; }
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

// Listen for measurement data from FiveM
window.addEventListener("message", (event) => {
  if (event.data && event.data.type === "measurement") {
    data.pos_x = event.data.pos_x;
    data.pos_y = event.data.pos_y;
    data.pos_z = event.data.pos_z;
  }
});

// Request initial position data on load
window.addEventListener("load", () => {
  window.parent.postMessage({ type: "getNamedData", keys: ["pos_x", "pos_y", "pos_z"] }, "*");
});

// Record a measurement when the user clicks "Record"
recordBtn.addEventListener("click", () => {
  const d = parseFloat(distanceInput.value);
  if (isNaN(d)) {
    results.innerHTML = "Enter a valid distance before recording.";
    return;
  }
  posList.push({ x: data.pos_x, y: data.pos_y, z: data.pos_z, d });
  results.innerHTML = `Recorded ${posList.length} point(s).`;
  if (posList.length >= 3) computeSolutions();
});

// Toggle between the two computed waypoints
toggleBtn.addEventListener("click", () => {
  if (solutions.length < 2) return;
  currentSolutionIndex = 1 - currentSolutionIndex;
  displaySolution(currentSolutionIndex);
});

// Reset all recorded data and UI
resetBtn.addEventListener("click", () => {
  posList.length = 0;
  solutions = [];
  currentSolutionIndex = 0;
  toggleBtn.disabled = true;
  distanceInput.value = "";
  data = {};
  results.innerHTML = "All data cleared.";

  // Inform FiveM to clear any existing waypoint
  window.parent.postMessage({ type: "clearWaypoint" }, "*");

  // Request fresh position data for next measurements
  window.parent.postMessage({ type: "getNamedData", keys: ["pos_x", "pos_y", "pos_z"] }, "*");
});

// Compute the two possible intersection points of three spheres
function computeSolutions() {
  const [s1, s2, s3] = posList;

  // Build orthonormal basis (ex, ey, ez)
  const rawEx = vecSub(s1, s2);
  const d = vecLength(rawEx);
  if (d < 1e-6) { results.innerHTML = "Points 1 and 2 are too close."; return; }
  const ex = vecNormalize(rawEx);

  const s1to3 = vecSub(s1, s3);
  const i = vecDot(ex, s1to3);
  const proj = vecScale(ex, i);
  // orthogonal component of s1to3 relative to ex
  const orth = vecSub(s1to3, proj);

  if (vecLength(orth) < 1e-6) { results.innerHTML = "Points are colinear."; posList.length = 0; return; }
  const ey = vecNormalize(orth);
  const ez = vecCross(ex, ey);
  const j = vecDot(ey, s1to3);

  // Solve local coordinates (x, y, z)
  const [r1, r2, r3] = [s1.d, s2.d, s3.d];
  const x = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
  const y = (r1 * r1 - r3 * r3 + i * i + j * j - 2 * i * x) / (2 * j);
  const z2 = r1 * r1 - x * x - y * y;
  if (z2 < 0) { results.innerHTML = "Inconsistent distances."; posList.length = 0; return; }
  const zPos = Math.sqrt(z2);
  const zNeg = -zPos;

  // Two candidate world points
  const solA = vecAdd(vecAdd(s1, vecScale(ex, x)), vecAdd(vecScale(ey, y), vecScale(ez, zPos)));
  const solB = vecAdd(vecAdd(s1, vecScale(ex, x)), vecAdd(vecScale(ey, y), vecScale(ez, zNeg)));

  solutions = [solA, solB];
  toggleBtn.disabled = false;
  displaySolution(0);
}

// Display and send a solution to FiveM
function displaySolution(idx) {
  const p = solutions[idx];
  results.innerHTML = `Solution ${idx + 1}: ${JSON.stringify(p)}`;
  // Send setWaypoint message
  window.parent.postMessage({ type: "setWaypoint", x: p.x, y: p.y, z: p.z }, "*");
}
