// Guns: the weapon table, the models (pistol, Uzi, sawed-off), the readable ammo counters, and per-frame gun animation
// (recoil, twirl reload, pistol-whip swing, muzzle flash). Every gun is a pistol that can hold one picked-up weapon.
import * as THREE from 'three';

export const MAG = 12; // pistol magazine

// basic(hex): the game's cached MeshBasicMaterial. pipColor / hpColor: ammo and health pips on the gun.
// maxHp: how many health pips. onChange(): ammo or weapon changed (resync pips, redraw the HUD).
export function createGunKit({ glowTex, basic, pipColor, hpColor, maxHp, onChange = () => {} }) {
  const gunMat = new THREE.MeshLambertMaterial({ color: 0x1f1f22 });
  const WEAPONS = {
    pistol: { name: 'PISTOL', auto: false, cool: .1, pellets: 1, spread: 0, ammo: MAG, kick: 1, force: 1, buzz: [.9, 55], muz: -.175 },
    mg: { name: 'UZI', auto: true, cool: .064, pellets: 1, spread: .032, ammo: 50, kick: .45, force: 1.05, buzz: [.5, 22], muz: -.23 },
    shotgun: { name: 'SAWED-OFF', auto: false, cool: .24, pellets: 9, spread: .1, ammo: 12, kick: 2.1, force: 2.5, buzz: [1, 140], muz: -.35 },
  };
  // Uzi: short boxy receiver, magazine up through the grip, stubby barrel, folded wire stock on top
  function addMG(gr){ const b=(w,h,d,x,y,z,m,rx)=>{ const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m||gunMat); o.position.set(x,y,z); if(rx) o.rotation.x=rx; gr.add(o); return o; };
    const dark=new THREE.MeshLambertMaterial({color:0x2c2c30});
    b(.046,.072,.2,0,.018,-.06);                         // receiver
    b(.048,.014,.15,0,.06,-.05,dark);                    // top cover
    b(.03,.2,.034,0,-.1,.005,dark,-.28);                 // magazine through the grip
    b(.008,.03,.06,0,-.035,-.105,dark);                  // trigger guard
    const br=new THREE.Mesh(new THREE.CylinderGeometry(.011,.011,.07,8),gunMat); br.rotation.x=Math.PI/2; br.position.set(0,.02,-.19); gr.add(br);
    const nut=new THREE.Mesh(new THREE.CylinderGeometry(.016,.016,.02,8),dark); nut.rotation.x=Math.PI/2; nut.position.set(0,.02,-.165); gr.add(nut);
    b(.006,.006,.16,-.02,.064,.03,dark); b(.006,.006,.16,.02,.064,.03,dark); b(.046,.006,.006,0,.064,.11,dark);   // folded wire stock
    b(.006,.012,.006,0,.07,-.15,dark); }
  // sawed-off: two short barrels side by side, break-action block, cut-down wooden grip
  function addSG(gr){ const b=(w,h,d,x,y,z,m,rx)=>{ const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m||gunMat); o.position.set(x,y,z); if(rx) o.rotation.x=rx; gr.add(o); return o; };
    const wood=new THREE.MeshLambertMaterial({color:0x3b2416}), steel=new THREE.MeshLambertMaterial({color:0x2b2b2e});
    b(.064,.055,.1,0,.012,-.04,steel);                   // action block
    [-.017,.017].forEach(x=>{ const br=new THREE.Mesh(new THREE.CylinderGeometry(.017,.017,.24,12),gunMat); br.rotation.x=Math.PI/2; br.position.set(x,.026,-.21); gr.add(br);
      const mz=new THREE.Mesh(new THREE.RingGeometry(.007,.017,12),new THREE.MeshBasicMaterial({color:0x050505,side:THREE.DoubleSide})); mz.position.set(x,.026,-.331); gr.add(mz); });
    b(.04,.02,.2,0,.0,-.19,wood);                        // short forend under the barrels
    b(.036,.11,.06,0,-.05,.04,wood,-.5);                 // sawn-off pistol grip
    b(.05,.04,.06,0,-.002,.03,wood);
    b(.008,.03,.05,0,-.03,-.03,steel); }
  function setWeapon(g, kind) {
    g.weapon = kind; const W = WEAPONS[kind];
    g.pistolParts.forEach(m => m.visible = kind === 'pistol'); g.mgG.visible = kind === 'mg'; g.sgG.visible = kind === 'shotgun';
    g.muzzle.position.z = W.muz; g.wAmmo = W.ammo; g.barrel = 0; onChange();
  }
  // accent: sight and laser colour. wristTex: a canvas texture for the wrist screen on this gun, or null.
    function makeGun(accent,wristTex){
    const root=new THREE.Group(), body=new THREE.Group(); body.position.set(0,-.015,.06); root.add(body);
    const box=(w,h,d,x,y,z,m)=>{ const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m); o.position.set(x,y,z); body.add(o); return o; };
    const pistolParts=[box(.034,.042,.19,0,.01,-.07,gunMat), box(.036,.004,.19,0,.033,-.07,new THREE.MeshLambertMaterial({color:0x3a3a3e})), box(.006,.008,.006,0,.036,-.155,basic(accent))];
    const grip=box(.03,.1,.042,0,-.045,0,gunMat); grip.rotation.x=-.28;
    const mgG=new THREE.Group(); addMG(mgG); mgG.visible=false; body.add(mgG);
    const sgG=new THREE.Group(); addSG(sgG); sgG.visible=false; body.add(sgG);
    const muzzle=new THREE.Object3D(); muzzle.position.set(0,.01,-.175); body.add(muzzle);
    const flash=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,color:0xffd090,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));
    flash.scale.setScalar(.2); flash.visible=false; muzzle.add(flash);
    const lg=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0),new THREE.Vector3(0,0,-22)]);
    const laser=new THREE.Line(lg,new THREE.LineBasicMaterial({color:accent,transparent:true,opacity:.22,blending:THREE.AdditiveBlending,depthWrite:false}));
    muzzle.add(laser);
    const ammoPips=new THREE.InstancedMesh(new THREE.BoxGeometry(.004,.006,.007),basic(pipColor),MAG); for(let i=0;i<MAG;i++) ammoPips.setMatrixAt(i,new THREE.Matrix4().makeTranslation(.019,.012,-.15+i*.011)); ammoPips.frustumCulled=false; body.add(ammoPips);
    const hpPips=new THREE.InstancedMesh(new THREE.BoxGeometry(.007,.008,.004),basic(hpColor),maxHp); for(let i=0;i<maxHp;i++) hpPips.setMatrixAt(i,new THREE.Matrix4().makeTranslation(-.016+i*.008,.045,.024)); hpPips.frustumCulled=false; body.add(hpPips);
    let wristScreen=null;
    if(wristTex){ wristScreen=new THREE.Mesh(new THREE.PlaneGeometry(.12,.06),new THREE.MeshBasicMaterial({map:wristTex,transparent:true,fog:false}));
      wristScreen.position.set(0,.085,.06); wristScreen.rotation.x=-.55; body.add(wristScreen); }
    return {root,body,muzzle,flash,laser,ammoPips,hpPips,ammo:MAG,kick:0,cool:0,spin:0,flashT:0,emptyT:0,meleeCd:0,whip:0,prevTip:null,
      pistolParts,mgG,sgG,weapon:'pistol',wAmmo:0,held:false};
  }
  // ammo you can read in VR: a counter on the Uzi and the sawed-off, shell lights on the sawed-off
  function addAmmoDisplay(g){
    const cv=document.createElement('canvas'); cv.width=96; cv.height=48; const tex=new THREE.CanvasTexture(cv);
    const scr=new THREE.Mesh(new THREE.PlaneGeometry(.05,.025),new THREE.MeshBasicMaterial({map:tex,transparent:true,fog:false}));
    scr.rotation.x=-1.05; scr.visible=false; g.body.add(scr);
    const shells=[-.017,.017].map(x=>{ const m=new THREE.Mesh(new THREE.BoxGeometry(.012,.006,.02),new THREE.MeshBasicMaterial({color:0xff3a2a})); m.position.set(x,.046,.0); m.visible=false; g.body.add(m); return m; });
    g.cnt={cv,tex,scr,shells,last:-1};
  }
  function drawCount(g){
    const c=g.cnt; if(!c) return; const sp=g.weapon!=='pistol'; c.scr.visible=sp; c.shells.forEach(m=>m.visible=g.weapon==='shotgun');
    if(!sp) return;
    if(g.weapon==='mg') c.scr.position.set(0,.078,.04); else c.scr.position.set(0,.05,.045);
    if(g.weapon==='shotgun'){ const loaded=Math.min(g.wAmmo,(g.barrel||0)%2===0?2:1); c.shells.forEach((m,i)=>m.material.color.setHex(i<loaded?0xff3a2a:0x2a0806)); }
    if(c.last===g.wAmmo) return; c.last=g.wAmmo;
    const x=c.cv.getContext('2d'), low=g.wAmmo<=Math.ceil(WEAPONS[g.weapon].ammo*.2);
    x.clearRect(0,0,96,48); x.fillStyle='rgba(6,6,6,.85)'; x.fillRect(0,0,96,48);
    x.fillStyle=low?'#ff3a2a':'#f2efe8'; x.font="900 40px 'Big Shoulders Display', Impact, sans-serif"; x.textAlign='center'; x.textBaseline='middle'; x.fillText(String(g.wAmmo),48,26);
    c.tex.needsUpdate=true;
  }
  // recoil, twirl, whip, muzzle flash; call for every gun every frame with real time
  function animateGun(g, realDt) {
      g.cool-=realDt; g.emptyT-=realDt; g.kick=Math.max(0,g.kick-realDt*9);
      if(g.spin>0) g.spin=Math.max(0,g.spin-realDt*20);
      g.meleeCd-=realDt; g.whip=Math.max(0,g.whip-realDt*5);
      g.body.rotation.x=g.kick*.45+g.spin-Math.sin(g.whip*Math.PI)*1.1; g.body.position.z=.06+g.kick*.03-Math.sin(g.whip*Math.PI)*.12; g.body.position.x=-Math.sin(g.whip*Math.PI)*.12;
      g.flashT-=realDt; g.flash.visible=g.flashT>0; if(g.flash.visible) g.flash.material.rotation=Math.random()*6;
      g.laser.visible=g.spin<=0; drawCount(g);
  }
  return { gunMat, WEAPONS, addMG, addSG, setWeapon, makeGun, addAmmoDisplay, drawCount, animateGun };
}

// A sawed-off blast throws the whole body: up and back along the shot, harder the closer they were.
// blastO: where the shot came from. k: 1 for a body killed by this blast, .5 for a corpse it hit. Returns the distance.
export function launchBody(r, dir, k, blastO, SIM_H, unbake) {
  const d = blastO.distanceTo(r.pts[2].c), hs = Math.max(1.2, Math.min(7, 8.4 - d * .8)) * k, vs = hs * .5, l = Math.hypot(dir.x, dir.z) || 1, ux = dir.x / l, uz = dir.z / l;
  r.asleep = false; r.still = 0; if (unbake) unbake(r);
  r.pts.forEach(p => { const j = .85 + Math.random() * .3; p.o.x -= ux * hs * j * SIM_H; p.o.z -= uz * hs * j * SIM_H; p.o.y -= vs * j * SIM_H; });
  return d;
}
