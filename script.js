const results = document.querySelector("#result");
let data = {};
const posList = [];

// Receive data from parent
window.addEventListener("message", (event) => {
  if (!Array.isArray(event.data.data)) {
    data = { ...data, ...event.data.data };
  }
});

// Request initial position data on load
window.addEventListener("load", () => {
  window.parent.postMessage(
    { type: "getNamedData", keys: ["pos_x", "pos_y", "pos_z"] },
    "*"
  );
});

// Record current position with distance
const recordBtn = document.querySelector("#record");
recordBtn.addEventListener("click", () => {
  const distance = parseFloat(document.querySelector("#distance").value);
  if (isNaN(distance)) {
    results.innerHTML = "Please enter a valid distance.";
    return;
  }

  posList.push({ x: data.pos_x, y: data.pos_y, z: data.pos_z, d: distance });
  results.innerHTML = `You have ${posList.length} listings recorded`;

  if (posList.length >= 4) calcLeastSquares();
});

// Least Squares Trilateration (requires >= 4 positions)
function calcLeastSquares() {
  const A = [];
  const b = [];
  const ref = posList[0];

  for (let i = 1; i < posList.length; i++) {
    const pi = posList[i];
    const xi = pi.x - ref.x;
    const yi = pi.y - ref.y;
    const zi = pi.z - ref.z;
    const di2 = pi.d ** 2 - ref.d ** 2;
    const ri2 = xi ** 2 + yi ** 2 + zi ** 2;

    // Matrix row for linear system
    A.push([2 * xi, 2 * yi, 2 * zi]);
    b.push([di2 - ri2]);
  }

  try {
    // Solve using pseudo-inverse A⁺ = (AᵗA)^(-1)Aᵗ * b
    const At = math.transpose(A);
    const AtA = math.multiply(At, A);
    const Atb = math.multiply(At, b);
    const solution = math.multiply(math.inv(AtA), Atb);

    // Add offset back from reference point
    const intersection = {
      x: ref.x + solution[0][0],
      y: ref.y + solution[1][0],
      z: ref.z + solution[2][0]
    };

    results.innerHTML =
      "The coordinates are at " + JSON.stringify(intersection, null, 2);

    window.parent.postMessage(
      { type: "setWaypoint", ...intersection },
      "*"
    );
  } catch (err) {
    results.innerHTML = "Error in computation: " + err.message;
  }

  // Clear list after calc
  posList.splice(0);
}
