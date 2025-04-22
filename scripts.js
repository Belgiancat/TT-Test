// Minimal Vector3 with necessary operations
class Vector3 {
  constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;}
  clone(){return new Vector3(this.x,this.y,this.z);}
  add(v){this.x+=v.x;this.y+=v.y;this.z+=v.z;return this;}
  sub(v){this.x-=v.x;this.y-=v.y;this.z-=v.z;return this;}
  multiplyScalar(s){this.x*=s;this.y*=s;this.z*=s;return this;}
  length(){return Math.hypot(this.x,this.y,this.z);}
  normalize(){const len=this.length();return len>0?this.multiplyScalar(1/len):this;}
  cross(v){
    const x=this.y*v.z - this.z*v.y;
    const y=this.z*v.x - this.x*v.z;
    const z=this.x*v.y - this.y*v.x;
    this.x=x; this.y=y; this.z=z;
    return this;
  }
  toString(){return `(${this.x.toFixed(2)},${this.y.toFixed(2)},${this.z.toFixed(2)})`;}
}

// API fallback for browser
if(typeof getData!=='function') window.getData = ({onSuccess}) => onSuccess({
  pos_x: 0, pos_y: 0, pos_z: 0, altitude: 0
});
if(typeof sendCommand!=='function') window.sendCommand = cmd => console.log('[sendCommand]',cmd);

// Fetch full position data
function fetchPosition(){
  return new Promise((res,rej)=>{
    getData({
      onSuccess:data=>{
        if(data.pos_x==null||data.pos_y==null||data.pos_z==null) return rej('Missing pos');
        // include altitude if present
        res(new Vector3(data.pos_x,data.pos_y,data.pos_z));
      },
      onError: err=>rej(err)
    });
  });
}

// Compute 3D intersection of two spheres
function intersectSpheres(c1,r1,c2,r2){
  // vector between centers
  const u = c2.clone().sub(c1);
  const d = u.length();
  if(d > r1+r2 || d < Math.abs(r1-r2)) throw new Error('No intersection');
  u.normalize();
  const a = (r1*r1 - r2*r2 + d*d) / (2*d);
  const C = c1.clone().add(u.clone().multiplyScalar(a));
  const h = Math.sqrt(Math.max(0, r1*r1 - a*a));
  // build perpendicular basis
  let arb = Math.abs(u.x)<0.9? new Vector3(1,0,0) : new Vector3(0,1,0);
  const v = u.clone().cross(arb).normalize();
  // two antipodal points on the circle
  const pA = C.clone().add(v.clone().multiplyScalar(h));
  const pB = C.clone().sub(v.clone().multiplyScalar(h));
  return [pA,pB];
}

// UI and state
const dist1 = document.getElementById('dist1');
const dist2 = document.getElementById('dist2');
const btn1 = document.getElementById('btn1');
const btn2 = document.getElementById('btn2');
const result = document.getElementById('result');
const actions = document.getElementById('actions');
let m1, m2;

btn1.onclick = async()=>{
  const r=parseFloat(dist1.value);
  if(isNaN(r)||r<=0) return alert('Invalid distance #1');
  try{
    const pos = await fetchPosition();
    m1={pos,r};
    result.textContent = `#1 at ${pos} r=${r}m`;
    actions.innerHTML='';
  }catch(e){alert('Error fetching pos #1:'+e);}
};

btn2.onclick = async()=>{
  const r=parseFloat(dist2.value);
  if(isNaN(r)||r<=0) return alert('Invalid distance #2');
  if(!m1) return alert('Record #1 first');
  try{
    const pos = await fetchPosition();
    m2={pos,r};
    result.textContent += `\n#2 at ${pos} r=${r}m`;
    showIntersections();
  }catch(e){alert('Error fetching pos #2:'+e);}
};

function showIntersections(){
  actions.innerHTML='';
  let pts;
  try{ pts = intersectSpheres(m1.pos,m1.r,m2.pos,m2.r); }
  catch(e){ return alert(e.message); }
  result.textContent += `\nIntersection points:`+
    `\nA: ${pts[0]}`+
    `\nB: ${pts[1]}`;

  ['A','B'].forEach((lbl,i)=>{
    const b=document.createElement('button');
    b.textContent = `Waypoint ${lbl}`;
    b.onclick = ()=>set3DWaypoint(pts[i],lbl);
    actions.appendChild(b);
  });
}

function set3DWaypoint(p,label){
  // send full 3D waypoint
  sendCommand({type:'setWaypoint',x:p.x,y:p.y,z:p.z});
  // notify user
  sendCommand({type:'notification',text:`Waypoint ${label}: ${p}`});
  result.textContent = `Waypoint set to ${label}: ${p}`;
}
