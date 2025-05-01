// ←– Replace this with your own private key (needs “map/positions.json” access)
const API_KEY = "0dIZ16tMp3wbPhbVlDeUdLWvkAq6BweeNSf1a";
const API_ORIGIN = "https://v1.api.tycoon.community/main";

// receive data
const results = document.querySelector("#result");
let data = {};
window.addEventListener("message", (event) => {
  if (!Array.isArray(event.data.data)) {
    data = { ...data, ...event.data.data };
  }
});
window.addEventListener("load", () => {
  window.parent.postMessage({ type: "getNamedData", keys: ["pos_x", "pos_y", "pos_z", "vRP_id"] }, "*");
});

// record data
const posList = [];
document.querySelector("#record").addEventListener("click", async () => {
  const distance = parseFloat(document.querySelector("#distance").value);
  // fetch our full history from the TT API :contentReference[oaicite:2]{index=2}
  const resp = await fetch(API_ORIGIN + "/map/positions.json", {
    headers: { "X-Tycoon-Key": API_KEY }
  });
  const json = await resp.json();
  // find our player by vRP id
  const me = json.players.find(p => p[2] === data.vRP_id);
  if (!me) {
    results.innerHTML = "Could not find your player in /map/positions.json";
    return;
  }
  // me[3] = current position, me[6] = history array [[idx,x,y,z],…]
  const cur = me[3], hist = me[6] || [];
  // push current + all history as separate “sensors”
  posList.push({ x: cur.x, y: cur.y, z: cur.z, d: distance });
  for (const step of hist) {
    posList.push({ x: step[1], y: step[2], z: step[3], d: distance });
  }
  results.innerHTML = "You have " + posList.length + " total samples recorded";
  if (posList.length > 3) calc();
});

// math function
async function calc() {
  const EPS = 1e-6;

  // 1) initial linear least-squares (as before)
  function solveLinear(sensors) {
    const s1 = sensors[0], N = sensors.length;
    const A = [], b = [];
    for (let i = 1; i < N; i++) {
      const si = sensors[i];
      A.push([2 * (si.x - s1.x), 2 * (si.y - s1.y), 2 * (si.z - s1.z)]);
      b.push(si.d * si.d - s1.d * s1.d +
        (s1.x * s1.x - si.x * si.x) +
        (s1.y * s1.y - si.y * si.y) +
        (s1.z * s1.z - si.z * si.z));
    }
    // form normal equations AtA·X = Atb
    const AtA = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], Atb = [0, 0, 0];
    for (let i = 0; i < A.length; i++) {
      for (let j = 0; j < 3; j++) {
        Atb[j] += A[i][j] * b[i];
        for (let k = 0; k < 3; k++) {
          AtA[j][k] += A[i][j] * A[i][k];
        }
      }
    }
    // invert 3×3 via Cramer's rule
    const m = AtA;
    const det = m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1])
      - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0])
      + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
    if (Math.abs(det) < EPS) throw new Error("ill-conditioned linear system");
    const invDet = 1 / det;
    const inv = [
      [(m[1][1] * m[2][2] - m[1][2] * m[2][1]) * invDet,
      -(m[0][1] * m[2][2] - m[0][2] * m[2][1]) * invDet,
      (m[0][1] * m[1][2] - m[0][2] * m[1][1]) * invDet],
      [-(m[1][0] * m[2][2] - m[1][2] * m[2][0]) * invDet,
      (m[0][0] * m[2][2] - m[0][2] * m[2][0]) * invDet,
      -(m[0][0] * m[1][2] - m[0][2] * m[1][0]) * invDet],
      [(m[1][0] * m[2][1] - m[1][1] * m[2][0]) * invDet,
      -(m[0][0] * m[2][1] - m[0][1] * m[2][0]) * invDet,
      (m[0][0] * m[1][1] - m[0][1] * m[1][0]) * invDet]
    ];
    return {
      x: inv[0][0] * Atb[0] + inv[0][1] * Atb[1] + inv[0][2] * Atb[2],
      y: inv[1][0] * Atb[0] + inv[1][1] * Atb[1] + inv[1][2] * Atb[2],
      z: inv[2][0] * Atb[0] + inv[2][1] * Atb[1] + inv[2][2] * Atb[2]
    };
  }

  // 2) Gauss-Newton refine on the true cost Σ(‖X−Si‖−di)² :contentReference[oaicite:3]{index=3}
  function refineGaussNewton(sensors, init) {
    let X = [init.x, init.y, init.z];
    for (let iter = 0; iter < 5; iter++) {
      // build JᵀJ and Jᵀr
      const JtJ = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], Jtr = [0, 0, 0];
      for (const s of sensors) {
        const dx = X[0] - s.x, dy = X[1] - s.y, dz = X[2] - s.z;
        const dist = Math.hypot(dx, dy, dz);
        if (dist < EPS) continue;
        const r = dist - s.d;
        const j = [dx / dist, dy / dist, dz / dist];
        for (let i = 0; i < 3; i++) {
          for (let k = 0; k < 3; k++) {
            JtJ[i][k] += j[i] * j[k];
          }
          Jtr[i] += j[i] * r;
        }
      }
      // solve JtJ · h = −Jtr
      const h = solve3x3(JtJ, Jtr.map(v => -v));
      X[0] += h[0]; X[1] += h[1]; X[2] += h[2];
    }
    return { x: X[0], y: X[1], z: X[2] };

    function solve3x3(A, b) {
      const m = A;
      const det = m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1])
        - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0])
        + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
      if (Math.abs(det) < EPS) return [0, 0, 0];
      const invDet = 1 / det;
      // compute adjugate manually...
      const adj = [
        [(m[1][1] * m[2][2] - m[1][2] * m[2][1]), -(m[0][1] * m[2][2] - m[0][2] * m[2][1]), (m[0][1] * m[1][2] - m[0][2] * m[1][1])],
        [-(m[1][0] * m[2][2] - m[1][2] * m[2][0]), (m[0][0] * m[2][2] - m[0][2] * m[2][0]), -(m[0][0] * m[1][2] - m[0][2] * m[1][0])],
        [(m[1][0] * m[2][1] - m[1][1] * m[2][0]), -(m[0][0] * m[2][1] - m[0][1] * m[2][0]), (m[0][0] * m[1][1] - m[0][1] * m[1][0])]
      ];
      return [
        (adj[0][0] * b[0] + adj[0][1] * b[1] + adj[0][2] * b[2]) * invDet,
        (adj[1][0] * b[0] + adj[1][1] * b[1] + adj[1][2] * b[2]) * invDet,
        (adj[2][0] * b[0] + adj[2][1] * b[1] + adj[2][2] * b[2]) * invDet
      ];
    }
  }

  let sol;
  try {
    const init = solveLinear(posList);
    sol = refineGaussNewton(posList, init);
  } catch (e) {
    results.innerHTML = "No real intersection—cleared all measurements. Try again!";
    posList.length = 0;
    return;
  }

  results.innerHTML = "The coordinates are at " + JSON.stringify(sol, null, 2);
  window.parent.postMessage({ type: "setWaypoint", ...sol }, "*");
  posList.length = 0;
}
