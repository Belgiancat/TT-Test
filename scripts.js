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

// Fallback stubs for in-browser testing
if (typeof getData !== 'function') {
  window.getData = ({ onSuccess }) => onSuccess({ pos_x: 0, pos_y: 0, pos_z: 0 });
}
if (typeof sendCommand !== 'function') {
  window.sendCommand = cmd => console.log('[Stub sendCommand]', cmd);
}

function getPos() {
  return new Promise((resolve, reject) => {
    getData({
      onSuccess: data => {
        if (data.pos_x == null || data.pos_y == null || data.pos_z == null) {
          reject('Missing position data');
        } else {
          resolve({ pos_x: data.pos_x, pos_y: data.pos_y, pos_z: data.pos_z });
        }
      },
      onError: reject
    });
  });
}

let measurements = [];
let intersections = [];
const resultEl = document.getElementById('result');
const switcher = document.getElementById('switcher');

// Record measurement #1
btn1.addEventListener('click', () => {
  const r1 = parseFloat(dist1.value);
  if (isNaN(r1)) return alert('Enter a valid number for Distance #1');
  getPos().then(p => {
    measurements[0] = { pos: new Vector3(p.pos_x, p.pos_y, p.pos_z), r: r1 };
    resultEl.textContent = `✔#1 @ ${measurements[0].pos} r₁=${r1}m`;
    switcher.innerHTML = '';
  }).catch(err => alert('Error getting position #1: ' + err));
});

// Record measurement #2 and compute
btn2.addEventListener('click', () => {
  const r2 = parseFloat(dist2.value);
  if (isNaN(r2)) return alert('Enter a valid number for Distance #2');
  getPos().then(p => {
    measurements[1] = { pos: new Vector3(p.pos_x, p.pos_y, p.pos_z), r: r2 };
    resultEl.textContent += `\n✔#2 @ ${measurements[1].pos} r₂=${r2}m`;
    computeLandmark();
  }).catch(err => alert('Error getting position #2: ' + err));
});

function computeLandmark() {
  const [m1, m2] = measurements;
  const dx = m2.pos.x - m1.pos.x;
  const dy = m2.pos.y - m1.pos.y;
  const d = Math.hypot(dx, dy);
  if (d > m1.r + m2.r || d < Math.abs(m1.r - m2.r)) {
    return alert('No circle intersection for given distances.');
  }

  const a = (m1.r*m1.r - m2.r*m2.r + d*d) / (2*d);
  const h = Math.sqrt(Math.max(0, m1.r*m1.r - a*a));
  const xm = m1.pos.x + (a*dx)/d;
  const ym = m1.pos.y + (a*dy)/d;
  const ox = -dy*(h/d);
  const oy = dx*(h/d);

  const zAvg = (m1.pos.z + m2.pos.z) / 2;
  intersections = [
    new Vector3(xm + ox, ym + oy, zAvg),
    new Vector3(xm - ox, ym - oy, zAvg)
  ];

  resultEl.textContent += `\nPossible locations:\nA: ${intersections[0]}\nB: ${intersections[1]}`;
  switcher.innerHTML = '';

  ['A','B'].forEach((lbl,i) => {
    const btn = document.createElement('button');
    btn.textContent = `Activate ${lbl}`;
    btn.onclick = () => setWaypoint(i, lbl);
    switcher.appendChild(btn);
  });
}

function setWaypoint(idx, label) {
  const p = intersections[idx];
  // 1) show elevation
  sendCommand({ type: 'notification', text: `Target ${label}: Z=${p.z.toFixed(1)}m (map ignores height)` });
  // 2) official map waypoint (2D)
  sendCommand({ type: 'setWaypoint', x: p.x, y: p.y });
  // 3) share local data for external 3D marker scripts
  sendCommand({ type: 'shareLocalData', key: 'landmark', value: `${p.x},${p.y},${p.z}` });

  resultEl.textContent = `Waypoint set XY to ${p.x.toFixed(2)},${p.y.toFixed(2)}; elevation ${p.z.toFixed(2)}m`;
}
