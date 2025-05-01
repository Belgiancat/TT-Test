// recieve data
const results = document.querySelector("#result");
let data = {};
window.addEventListener("message", (event) => {
  if (!Array.isArray(event.data.data)) {
    data = { ...data, ...event.data.data };
  }
});
window.addEventListener("load", () => {
  window.parent.postMessage({ type: "getNamedData", keys: ["pos_x", "pos_y", "pos_z"] }, "*");
});

// record data
const posList = [];
document.querySelector("#record").addEventListener("click", () => {
  const distance = parseFloat(document.querySelector("#distance").value);
  posList.push({ x: data.pos_x, y: data.pos_y, z: data.pos_z, d: distance });
  results.innerHTML = "You have " + posList.length + " listings recorded";
  if (posList.length > 2) { calc(); }
});

// math function
function calc() {
  const EPS = 1e-6;

  // the existing 3-point solver (unchanged)
  function solveTriple([s1, s2, s3]) {
    const toVec = (a, b) => [b.x - a.x, b.y - a.y, b.z - a.z];
    const dot = (v1, v2) => v1.reduce((sum, v, i) => sum + v * v2[i], 0);
    const cross = (v1, v2) => [
      v1[1] * v2[2] - v1[2] * v2[1],
      v1[2] * v2[0] - v1[0] * v2[2],
      v1[0] * v2[1] - v1[1] * v2[0]
    ];

    // basis
    const ex = toVec(s1, s2);
    const d = Math.hypot(...ex);
    const exNorm = ex.map(e => e / d);
    const i = dot(exNorm, toVec(s1, s3));
    const temp = toVec(s1, s3).map((v, idx) => v - i * exNorm[idx]);
    const ey = temp.map(v => v / Math.hypot(...temp));
    const ez = cross(exNorm, ey);
    const j = dot(ey, toVec(s1, s3));

    if (Math.abs(j) < EPS) throw new Error("collinear");

    // circle center in plane
    const x = (s1.d ** 2 - s2.d ** 2 + d ** 2) / (2 * d);
    const y = (s1.d ** 2 - s3.d ** 2 + i ** 2 + j ** 2 - 2 * i * x) / (2 * j);

    // z
    let z2 = s1.d ** 2 - x ** 2 - y ** 2;
    if (z2 < -EPS) throw new Error("no-solution");
    z2 = Math.max(0, z2);
    const z = Math.sqrt(z2);

    // two mirror solutions, pick best residual
    const cands = [z, -z].map(zv => ({
      x: s1.x + x * exNorm[0] + y * ey[0] + zv * ez[0],
      y: s1.y + x * exNorm[1] + y * ey[1] + zv * ez[1],
      z: s1.z + x * exNorm[2] + y * ey[2] + zv * ez[2]
    }));
    let best = null, bestErr = Infinity;
    for (const P of cands) {
      const err = [s1, s2, s3].reduce((sum, s) => {
        const dist = Math.hypot(P.x - s.x, P.y - s.y, P.z - s.z);
        return sum + (dist - s.d) ** 2;
      }, 0);
      if (err < bestErr) { bestErr = err; best = P; }
    }
    return { pt: best, err: bestErr };
  }

  // generate all combinations of n elements taken k
  function combinations(arr, k) {
    if (k === 0) return [[]];
    if (arr.length < k) return [];
    const [head, ...tail] = arr;
    const withHead = combinations(tail, k - 1).map(c => [head, ...c]);
    const withoutHead = combinations(tail, k);
    return withHead.concat(withoutHead);
  }

  let solution, solutionErr = Infinity;

  if (posList.length === 3) {
    // just solve the triple
    try {
      const { pt, err } = solveTriple(posList);
      solution = pt; solutionErr = err;
    } catch (e) {
      solution = null;
    }
  } else {
    // try every triple, pick the one that best fits all sensors :contentReference[oaicite:0]{index=0}
    for (const triple of combinations(posList, 3)) {
      try {
        const { pt, err: triErr } = solveTriple(triple);
        // compute total error across all readings
        const totalErr = posList.reduce((sum, s) => {
          const dAct = Math.hypot(pt.x - s.x, pt.y - s.y, pt.z - s.z);
          return sum + (dAct - s.d) ** 2;
        }, 0);
        if (totalErr < solutionErr) {
          solutionErr = totalErr;
          solution = pt;
        }
      } catch (_) {
        // skip degenerate/no-solution triples
      }
    }
  }

  if (!solution) {
    results.innerHTML = "No real intersection, cleared all measurements. Try again!";
    posList.length = 0;
    return;
  }

  // output best solution
  results.innerHTML = "The coordinates are at " + JSON.stringify(solution, null, 2);
  window.parent.postMessage({ type: "setWaypoint", ...solution }, "*");
  posList.length = 0;
}
