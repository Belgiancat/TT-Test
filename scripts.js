class Vector3 {
    constructor(x = 0, y = 0, z = 0) {
      this.x = x;
      this.y = y;
      this.z = z;
    }
    toString() {
      return `(${this.x.toFixed(2)}, ${this.y.toFixed(2)}, ${this.z.toFixed(2)})`;
    }
  }
  
  function getPos() {
    return new Promise((resolve, reject) => {
      getNamedData({
        keys: ['pos_x', 'pos_y', 'pos_z'],
        onSuccess: resolve,
        onError: reject
      });
    });
  }
  
  let measurements = [];
  let intersections = [];
  
  document.getElementById('btn1').addEventListener('click', () => {
    const d = parseFloat(document.getElementById('dist1').value);
    if (isNaN(d)) return alert('Please enter a valid number for Distance 1');
    getPos().then(data => {
      measurements[0] = {
        pos: new Vector3(data.pos_x, data.pos_y, data.pos_z),
        r: d
      };
      document.getElementById('result').textContent =
        `✔ Recorded #1 at ${measurements[0].pos.toString()}, r₁=${d}m`;
      document.getElementById('switcher').innerHTML = '';
    }).catch(() => alert('Failed to get position for measurement 1'));
  });
  
  document.getElementById('btn2').addEventListener('click', () => {
    const d = parseFloat(document.getElementById('dist2').value);
    if (isNaN(d)) return alert('Please enter a valid number for Distance 2');
    getPos().then(data => {
      measurements[1] = {
        pos: new Vector3(data.pos_x, data.pos_y, data.pos_z),
        r: d
      };
      document.getElementById('result').textContent +=
        `\n✔ Recorded #2 at ${measurements[1].pos.toString()}, r₂=${d}m\n`;
      computeLandmark();
    }).catch(() => alert('Failed to get position for measurement 2'));
  });
  
  function computeLandmark() {
    const [m1, m2] = measurements;
    const { pos: p1, r: r1 } = m1;
    const { pos: p2, r: r2 } = m2;
    const dx = p2.x - p1.x, dy = p2.y - p1.y;
    const d = Math.hypot(dx, dy);
    const resultEl = document.getElementById('result');
    const switcher = document.getElementById('switcher');
    switcher.innerHTML = '';
    intersections = [];
  
    if (d > r1 + r2 || d < Math.abs(r1 - r2)) {
      return alert('No intersection of the two distance‑circles in the XY plane.');
    }
  
    const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
    const h = Math.sqrt(Math.max(0, r1 * r1 - a * a));
    const xm = p1.x + (a * dx) / d;
    const ym = p1.y + (a * dy) / d;
    const ox = -dy * (h / d);
    const oy = dx * (h / d);
  
    const pA = new Vector3(xm + ox, ym + oy, (p1.z + p2.z) / 2);
    const pB = new Vector3(xm - ox, ym - oy, (p1.z + p2.z) / 2);
    intersections = [pA, pB];
  
    resultEl.textContent +=
      `Possible landmark locations:\n` +
      `A: ${pA.toString()}\n` +
      `B: ${pB.toString()}\n`;
  
    ['A', 'B'].forEach((label, i) => {
      const btn = document.createElement('button');
      btn.textContent = `Activate Location ${label}`;
      btn.addEventListener('click', () => {
        const p = intersections[i];
        sendCommand({ type: "setWaypoint", x: p.x, y: p.y });
        resultEl.textContent = `Waypoint set to Location ${label}: ${p.toString()}`;
      });
      switcher.appendChild(btn);
    });
  }
  