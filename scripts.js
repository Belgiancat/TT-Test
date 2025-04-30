// recieve data

let data = {};

window.addEventListener("message", (event) => {
  if (!Array.isArray(event.data.data)) {
    data = { ...data, ...event.data.data };
    // document.querySelector("#result").innerHTML = JSON.stringify(data, null, 2);
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
  if (posList.lenght > 2) { calc(); }
});

// math

function calc() {
  const [s1, s2, s3] = posList;
  const toVec = (a, b) => [b.x - a.x, b.y - a.y, b.z - a.z];
  const dot = (v1, v2) => v1.reduce((sum, v, i) => sum + v * v2[i], 0);
  const cross = (v1, v2) => [
    v1[1] * v2[2] - v1[2] * v2[1],
    v1[2] * v2[0] - v1[0] * v2[2],
    v1[0] * v2[1] - v1[1] * v2[0]
  ];

  // Step 1: Define coordinate system
  const ex = toVec(s1, s2);
  const d = Math.hypot(...ex);
  const exNorm = ex.map(e => e / d);

  const i = dot(exNorm, toVec(s1, s3));
  const temp = toVec(s1, s3).map((val, idx) => val - i * exNorm[idx]);

  const ey = temp.map(val => val / Math.hypot(...temp));
  const ez = cross(exNorm, ey);

  const j = dot(ey, toVec(s1, s3));

  // Step 2: Solve for coordinates
  const x = (s1.d ** 2 - s2.d ** 2 + d ** 2) / (2 * d);
  const y = (s1.d ** 2 - s3.d ** 2 + i ** 2 + j ** 2 - 2 * i * x) / (2 * j);
  const zSquare = s1.d ** 2 - x ** 2 - y ** 2;

  if (zSquare < 0) {
    return; // No real intersection 
    // To Do: A way to give information to user
  }

  const z = Math.sqrt(zSquare);

  // Compute result in original coordinate system
  const result = {
    x: s1.x + x * exNorm[0] + y * ey[0] + z * ez[0],
    y: s1.y + x * exNorm[1] + y * ey[1] + z * ez[1],
    z: s1.z + x * exNorm[2] + y * ey[2] + z * ez[2]
  };

  window.parent.postMessage({ type: "setWaypont", ...result }, "*");
}
