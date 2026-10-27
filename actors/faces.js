// Enemy faces: eyes, brows and mouth drawn on a canvas and laid on the front of the head, one texture per expression.
// Swap e.face.material to faceMats[name] to change expression.
import * as THREE from 'three';

// faces: drawn eyes, brows and mouth on a transparent plane over the head's front, swapped per expression
export const FACE_SET={ neutral:['open','flat','smirk'], neutral_blink:['closed','flat','smirk'], angry:['angry','angry','grimace'], angry_blink:['closed','angry','grimace'],
  pain:['squint','worried','open'], scared:['wide','raised','O'], scream:['wide','angry','scream'], dead:['rolled','flat','slack'],
  agony:['squint','worried','scream'], plead:['wide','worried','open'] };
export function drawFace([eyes,brows,mouth]){
  const S=128, cv=document.createElement('canvas'); cv.width=cv.height=S; const g=cv.getContext('2d');
  g.lineCap='round'; g.lineJoin='round';
  const L=41, R=87, EY=54, lid='#2a1810', browC='#2b1b11';
  // faint smile lines from the nose to the mouth corners
  g.strokeStyle='rgba(70,35,20,.22)'; g.lineWidth=1.6;
  [[53,1],[75,-1]].forEach(([x,sd])=>{ g.beginPath(); g.moveTo(x,72); g.quadraticCurveTo(x-4*sd,82,x-2*sd,90); g.stroke(); });
  const eye=(x,side)=>{
    g.save();
    if(eyes==='closed'){ g.strokeStyle=lid; g.lineWidth=2.4; g.beginPath(); g.moveTo(x-8,EY); g.quadraticCurveTo(x,EY+3.5,x+8,EY); g.stroke(); g.restore(); return; }
    if(eyes==='squint'){ g.strokeStyle=lid; g.lineWidth=2.6; g.beginPath(); g.moveTo(x-8,EY-1); g.quadraticCurveTo(x,EY+3,x+8,EY-1); g.stroke();
      g.lineWidth=1.3; g.strokeStyle='rgba(42,24,16,.6)'; g.beginPath(); g.moveTo(x-7,EY+4); g.quadraticCurveTo(x,EY+6.5,x+7,EY+4); g.stroke();
      g.beginPath(); g.moveTo(x+side*-9,EY-3); g.lineTo(x+side*-12,EY-1); g.moveTo(x+side*-9,EY+2); g.lineTo(x+side*-12,EY+3); g.stroke(); g.restore(); return; }
    const rx=eyes==='wide'?8.2:7.4, ry=eyes==='wide'?5.4:eyes==='angry'?3.4:4.1;
    g.beginPath(); g.ellipse(x,EY,rx,ry,0,0,6.29); g.fillStyle='#ece5da'; g.fill(); g.clip();
    const iy=eyes==='rolled'?EY-4.6:EY+.3;
    g.fillStyle='#4a2f1e'; g.beginPath(); g.arc(x,iy,3.7,0,6.29); g.fill();
    g.fillStyle='#0d0806'; g.beginPath(); g.arc(x,iy,eyes==='wide'?1.4:1.9,0,6.29); g.fill();
    g.fillStyle='rgba(255,255,255,.85)'; g.beginPath(); g.arc(x+1.2,iy-1.2,.8,0,6.29); g.fill();
    if(eyes==='angry'){ g.globalCompositeOperation='destination-out'; g.beginPath();
      g.moveTo(x-12,EY-9); g.lineTo(x+12,EY-9); side<0?g.lineTo(x+12,EY-.5):g.lineTo(x-12,EY-.5); g.closePath(); g.fill(); }
    g.restore();
    g.strokeStyle=lid; g.lineWidth=2.2; g.beginPath();
    if(eyes==='angry'){ side<0?(g.moveTo(x-8,EY-3.5),g.lineTo(x+8,EY-.5)):(g.moveTo(x-8,EY-.5),g.lineTo(x+8,EY-3.5)); }
    else g.ellipse(x,EY,rx,ry,0,Math.PI*1.08,Math.PI*1.92);
    g.stroke();
    g.strokeStyle='rgba(42,24,16,.35)'; g.lineWidth=1; g.beginPath(); g.ellipse(x,EY,rx,ry,0,Math.PI*.15,Math.PI*.85); g.stroke();
  };
  eye(L,1); eye(R,-1);
  g.strokeStyle=browC; g.lineWidth=3.4;
  const brow=(x1,y1,cx,cy,x2,y2)=>{ g.beginPath(); g.moveTo(x1,y1); g.quadraticCurveTo(cx,cy,x2,y2); g.stroke(); };
  if(brows==='flat'){ brow(L-10,EY-10,L,EY-13,L+9,EY-11); brow(R-9,EY-11,R,EY-13,R+10,EY-10); }
  if(brows==='angry'){ brow(L-10,EY-14,L,EY-13,L+9,EY-7); brow(R-9,EY-7,R,EY-13,R+10,EY-14); }
  if(brows==='worried'){ brow(L-10,EY-9,L,EY-12,L+9,EY-15); brow(R-9,EY-15,R,EY-12,R+10,EY-9); }
  if(brows==='raised'){ brow(L-10,EY-14,L,EY-19,L+9,EY-15); brow(R-9,EY-15,R,EY-19,R+10,EY-14); }
  const MY=96, dark='#2a0a08', lip='rgba(120,52,44,.55)';
  const lower=(w)=>{ g.fillStyle=lip; g.beginPath(); g.ellipse(64,MY+3.5,w,2.4,0,0,6.29); g.fill(); };
  g.strokeStyle='#3a1610'; g.lineWidth=2;
  if(mouth==='flat'){ lower(8); g.beginPath(); g.moveTo(55,MY); g.quadraticCurveTo(64,MY+1,73,MY); g.stroke(); }
  if(mouth==='smirk'){ lower(7.5); g.beginPath(); g.moveTo(55,MY+.5); g.quadraticCurveTo(66,MY+1.5,75,MY-3); g.stroke(); }
  if(mouth==='grimace'){ g.fillStyle=dark; g.beginPath(); g.ellipse(64,MY+1,12,5.5,0,0,6.29); g.fill();
    g.fillStyle='#ddd5c6'; g.fillRect(54,MY-3,20,3.2); g.fillRect(55,MY+1.5,18,2.6);
    g.strokeStyle='rgba(42,10,8,.6)'; g.lineWidth=.8; for(let x=57;x<73;x+=3.4){ g.beginPath(); g.moveTo(x,MY-3); g.lineTo(x,MY+4); g.stroke(); }
    g.strokeStyle='#3a1610'; g.lineWidth=1.6; g.beginPath(); g.ellipse(64,MY+1,12,5.5,0,0,6.29); g.stroke(); }
  if(mouth==='open'){ g.fillStyle=dark; g.beginPath(); g.ellipse(64,MY+2,6.5,4.6,0,0,6.29); g.fill(); g.strokeStyle=lip; g.lineWidth=2; g.stroke(); }
  if(mouth==='O'){ g.fillStyle=dark; g.beginPath(); g.ellipse(64,MY+3,4.6,6.4,0,0,6.29); g.fill(); g.strokeStyle=lip; g.lineWidth=2; g.stroke(); }
  if(mouth==='scream'){ g.fillStyle=dark; g.beginPath(); g.ellipse(64,MY+3,9.5,9,0,0,6.29); g.fill(); g.fillStyle='#ddd5c6'; g.fillRect(57,MY-5,14,2.6);
    g.fillStyle='#8a3030'; g.beginPath(); g.ellipse(64,MY+9,5.5,2.8,0,0,6.29); g.fill(); g.strokeStyle=lip; g.lineWidth=2; g.beginPath(); g.ellipse(64,MY+3,9.5,9,0,0,6.29); g.stroke(); }
  if(mouth==='slack'){ g.fillStyle=dark; g.beginPath(); g.ellipse(65,MY+2,5.5,3.2,.2,0,6.29); g.fill(); lower(6); }
  const t=new THREE.CanvasTexture(cv); t.anisotropy=2; return t;
}
// a plane bent to sit on the rounded front of the head (head: .2 x .245 x .22, corner radius .06)
function makeFaceGeo(){ const g=new THREE.PlaneGeometry(.19,.22,12,12), pos=g.attributes.position;
  for(let i=0;i<pos.count;i++){ const dx=Math.max(0,Math.abs(pos.getX(i))-.04), dy=Math.max(0,Math.abs(pos.getY(i))-.0625), q=.0036-dx*dx-dy*dy;
    pos.setZ(i,(q>0?.05+Math.sqrt(q):.05)-.11+.0025); }
  g.computeVertexNormals(); return g; }

// kit: from createBodyKit. dressHead(m, e, k): add hats and the like to a finished head.
/**
 * @param {any} kit
 * @param {{ dressHead?: (m: any, e: any, k: number) => void }} [opts]
 */
export function createFaces(kit, { dressHead } = {}) {
  const { rbox, lam, glassesMat } = kit;
  const faceGeo = makeFaceGeo();
  const faceMats = {};
  for (const k in FACE_SET) { const t = drawFace(FACE_SET[k]); faceMats[k] = new THREE.MeshLambertMaterial({ map: t, emissiveMap: t, emissive: 0x3a3632, alphaTest: .4 }); }
  // a head at scale k with face, nose, ears, and e.hair / e.shades / e.stache when set. dead: a corpse's face, not e.face.
  function buildHead(e, k, dead) {
    const m = new THREE.Mesh(rbox(.2 * k, .245 * k, .22 * k, .06 * k), e.mats.skin);
    const face = new THREE.Mesh(faceGeo, dead ? faceMats.dead : faceMats.neutral); face.scale.setScalar(k); face.position.z = .11 * k; m.add(face);
    const nose = new THREE.Mesh(rbox(.032 * k, .055 * k, .04 * k, .012 * k), e.mats.skin); nose.position.set(0, -.014 * k, .118 * k); nose.rotation.x = -.12; m.add(nose);
    [-1, 1].forEach(sx => { const ear = new THREE.Mesh(rbox(.026 * k, .062 * k, .045 * k, .011 * k), e.mats.skin); ear.position.set(sx * .102 * k, 0, -.004 * k); m.add(ear); });
    if (e.hair) {
      const hm = lam(e.hair);
      const top = new THREE.Mesh(rbox(.212 * k, .075 * k, .232 * k, .035 * k), hm); top.position.set(0, .096 * k, -.006 * k); m.add(top);
      const back = new THREE.Mesh(rbox(.21 * k, .13 * k, .05 * k, .02 * k), hm); back.position.set(0, .03 * k, -.098 * k); m.add(back);
    }
    if (e.shades) { const gl = new THREE.Mesh(rbox(.2 * k, .048 * k, .02 * k, .01 * k), glassesMat); gl.position.set(0, .02 * k, .12 * k); m.add(gl); }
    if (e.stache) { const st = new THREE.Mesh(rbox(.074 * k, .016 * k, .014 * k, .005 * k), lam(e.hair || 0x1a1008)); st.position.set(0, -.04 * k, .117 * k); m.add(st); }
    if (dressHead) dressHead(m, e, k);
    if (!dead) e.face = face;
    return m;
  }
  // change expression without reassigning the material every frame
  function setExpr(e, ex) { if (ex !== e.expr) { e.expr = ex; e.face.material = faceMats[ex]; } }
  return { faceMats, faceGeo, buildHead, setExpr };
}
