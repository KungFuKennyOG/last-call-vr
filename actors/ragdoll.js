// Ragdolls: verlet bodies with 15 joints that fall the way they were hit, lose heads and limbs,
// and, when still alive, clutch their wounds, crawl, moan and bleed out.
import * as THREE from 'three';

// joints: 0 head top, 1 neck, 2 pelvis, 3 shL, 4 elL, 5 haL, 6 shR, 7 elR, 8 haR, 9 hipL, 10 knL, 11 ftL, 12 hipR, 13 knR, 14 ftR
//
// C, read at call time, so it can name things the game defines later:
//  scene, headPos, groundAt(x,z,y), pushOut(p,r,y,tall)                     the level
//  buildHead, faceMats, capGeo, rbox, cylGeo, boxGeo, torsoRagGeo,           bodies (actors/body.js, actors/faces.js)
//  shoeMat, beltMat, stumpMat, gunMat, ENEMY_GUN
//  decal, spray, mist                                                        fx
//  sfxMoan(dist,pitch,pos), sfxCrunch(), sfxSpurt()                          sounds
//  bakeRag(r), unbakeRag(r)                                                  merge a resting body into one mesh and back
//  addHittables(...meshes), removeHittables(set)                             the game's list of things bullets can hit
//  forceMul()                                                                current hit force multiplier (1 normally)
//  onBledOut(r)                                                              a downed enemy just died
// Returns { ragdolls, makeRagdoll, removeRagdoll, impulse, sever, updateRagdoll, renderRagdoll, SIM_H }.
export function createRagdolls(C) {
  const UPV = new THREE.Vector3(0, 1, 0), vS = new THREE.Vector3();
  // joints: 0 head top,1 neck,2 pelvis,3 shL,4 elL,5 haL,6 shR,7 elR,8 haR,9 hipL,10 knL,11 ftL,12 hipR,13 knR,14 ftR
  const RAG_CONS=[[0,1],[0,3],[0,6],[1,3],[1,6],[3,6],[1,2],[2,9],[2,12],[9,12],[3,9],[6,12],[3,12],[6,9],
    [3,4],[4,5],[6,7],[7,8],[9,10],[10,11],[12,13],[13,14]];
  const RAG_MIN=[[5,3,.55],[8,6,.55],[11,9,.6],[14,12,.6],[0,2,.85],[10,2,.7],[13,2,.7]];
  /** @type {[number, number, number, string, string, string][]} */
  const RAG_SEGS=[ // a,b,radius,material,part,side
    [1,0,0,'skin','head',''],
    [3,4,.056,'sleeve','arm','L'],[4,5,.047,'sleeve','arm','L'],
    [6,7,.056,'sleeve','arm','R'],[7,8,.047,'sleeve','arm','R'],
    [9,10,.078,'pants','leg','L'],[10,11,.062,'pants','leg','L'],
    [12,13,.078,'pants','leg','R'],[13,14,.062,'pants','leg','R']];
  const SEVER={ head:{at:1,sub:[0],from:2}, armL:{at:3,sub:[4,5],from:6}, armR:{at:6,sub:[7,8],from:3}, legL:{at:9,sub:[10,11],from:12}, legR:{at:12,sub:[13,14],from:9} };
  const SIM_H=1/120, GRAV=-9.8;
  const ragdolls=[];
  const Y=new THREE.Vector3(0,1,0), bx=new THREE.Vector3(), by=new THREE.Vector3(), bz=new THREE.Vector3(), basis=new THREE.Matrix4();

  function makeRagdoll(e,hitPoint,dir,partName,side,force,living){
    e.group.updateMatrixWorld(true);
    const s=e.s||e.def.scale;
    const pts=e.marks.map(m=>{ const c=m.getWorldPosition(new THREE.Vector3()); return {c,o:c.clone().addScaledVector(e.vel,-SIM_H)}; });
    /** @type {{ a: number, b: number, rest: number, min?: boolean }[]} */
    const cons=RAG_CONS.map(([a,b])=>({a,b,rest:pts[a].c.distanceTo(pts[b].c)}));
    RAG_MIN.forEach(([a,b,k])=>cons.push({a,b,rest:pts[a].c.distanceTo(pts[b].c)*k,min:true}));
    const g=new THREE.Group(); C.scene.add(g);
    const r={pts,cons,segs:[],g,asleep:false,still:0,age:0,acc:0,headOn:true,severed:new Set(),emitters:[],stumps:[],puddle:false,s};
    RAG_SEGS.forEach(([a,b,rad,mk,pn,sd])=>{
      const len=Math.max(.05,pts[a].c.distanceTo(pts[b].c));
      const m=pn==='head'?C.buildHead(e,s,!living):new THREE.Mesh(C.capGeo(rad*s,len),e.mats[mk]);
      m.userData={rag:r,part:pn,side:sd}; g.add(m);
      if(b===5||b===8){ const hd=new THREE.Mesh(C.rbox(.075*s,.1*s,.035*s,.015*s),e.mats.skin); hd.position.y=len/2+.035*s; m.add(hd);
        if(b===8&&e.kind!=='rusher'){ const [gg,gy]=C.ENEMY_GUN[e.kind]; const gn=new THREE.Mesh(gg,C.gunMat); gn.position.y=len/2+(-gy-.3)*s; m.add(gn); } }
      if(b===11||b===14){ const sh=new THREE.Mesh(C.rbox(.1*s,.08*s,.25*s,.03*s),C.shoeMat); sh.position.set(0,len/2+.01*s,.045*s); m.add(sh); }
      r.segs.push({a,b,m,part:pn,side:sd});
    });
    r.torso=new THREE.Mesh(C.torsoRagGeo(s),e.mats.top); r.torso.userData={rag:r,part:'body',side:''}; g.add(r.torso);
    { const pv=new THREE.Mesh(C.rbox(.33*s,.2*s,.22*s,.07*s),e.mats.pants); pv.position.y=-.255*s; r.torso.add(pv);
      const bl=new THREE.Mesh(C.rbox(.335*s,.04*s,.225*s,.015*s),C.beltMat); bl.position.y=-.155*s; r.torso.add(bl);
      const nk=new THREE.Mesh(C.cylGeo(.055*s,.14*s),e.mats.skin); nk.position.y=.355*s; r.torso.add(nk); }
    C.addHittables(r.torso,...r.segs.map(x=>x.m));
    ragdolls.push(r);
    impulse(r,hitPoint,dir,force);
    // knees buckle forward and the hips drop, so a body never stays balanced on its feet
    { const ry=e.group.rotation.y, fx=Math.sin(ry), fz=Math.cos(ry), kb=(1.6+Math.random())*SIM_H;
      [10,13].forEach(i=>{ pts[i].o.x-=fx*kb; pts[i].o.z-=fz*kb; });
      pts[2].o.y+=.9*SIM_H; pts[2].o.x+=fx*.5*SIM_H; pts[2].o.z+=fz*.5*SIM_H; }
    if(living) makeLiving(r,e,partName,side,hitPoint);
    else if(partName==='head') sever(r,'head',dir);
    else if((partName==='arm'||partName==='leg') && Math.random()<(C.forceMul()>1.5?.85:.45)) sever(r,partName+side,dir);
    else if(partName==='body' && C.forceMul()>1.5 && Math.random()<.35) sever(r,Math.random()<.5?'armL':'armR',dir);
    if(ragdolls.length>14){ const old=ragdolls.find(x=>!x.living); if(old) removeRagdoll(old); }
    renderRagdoll(r);
    return r;
  }
  // a downed body is still a ragdoll, but it has muscles: it clutches its wound, kicks, claws itself along, tries to roll over
  const mA=new THREE.Vector3(), mB=new THREE.Vector3(), mUp=new THREE.Vector3(), mR=new THREE.Vector3(), mF=new THREE.Vector3(), mD=new THREE.Vector3(), mC=new THREE.Vector3();
  const WOUND={ legL:[9,10,.55], legR:[12,13,.55], armL:[3,4,.6], armR:[6,7,.6], gut:[2,1,.3], chest:[1,2,.3] };
  function push(p,v,dv){ p.o.x-=v.x*dv; p.o.y-=v.y*dv; p.o.z-=v.z*dv; }              // add a velocity change (m/s * step)
  function accel(p,v,a){ const k=a*SIM_H*SIM_H; p.o.x-=v.x*k; p.o.y-=v.y*k; p.o.z-=v.z*k; }
  function pullTo(p,t,k){ const q=k*SIM_H*SIM_H; p.o.x-=(t.x-p.c.x)*q; p.o.y-=(t.y-p.c.y)*q; p.o.z-=(t.z-p.c.z)*q; }
  function damp(p,a){ p.o.x+=(p.c.x-p.o.x)*a; p.o.y+=(p.c.y-p.o.y)*a; p.o.z+=(p.c.z-p.o.z)*a; }
  function makeLiving(r,e,partName,side,hitPoint){
    const lp=e.inner.worldToLocal(hitPoint.clone());
    const key=partName==='leg'?'leg'+side:partName==='arm'?'arm'+side:(lp.y<1.16?'gut':'chest');
    const armOut=partName==='arm'?side:null;
    r.living={ age:0, bleed:10+Math.random()*8, cT:Math.random(), moanT:.5, trailT:.3, faceT:0, rollT:1.5+Math.random(),
      w:WOUND[key], key, clutch:armOut==='L'?8:5, crawlHands:armOut==='L'?[8]:armOut==='R'?[5]:[5,8], reach:0,
      mode:Math.random()<.65?'crawl':'writhe', crawlAway:Math.random()<.45, pitch:(e.kind==='heavy'?80:105)+Math.random()*30 };
    r.face=e.face; r.face.material=C.faceMats.agony;
    // the fall depends on the wound
    const P=r.pts, ry=e.group.rotation.y; mF.set(Math.sin(ry),0,Math.cos(ry)); const h=SIM_H;
    if(partName==='leg'){ const kn=side==='L'?10:13, hip=side==='L'?9:12; push(P[kn],mF,2.6*h); push(P[hip],UPV,-1.2*h); push(P[2],UPV,-.8*h); }
    else if(key==='gut'){ push(P[0],mF,2.2*h); push(P[1],mF,1.8*h); push(P[2],mF,-.9*h); [10,13].forEach(i=>push(P[i],mF,1.4*h)); }
    else if(key==='chest'){ push(P[0],mF,-1.6*h); push(P[1],mF,-1.4*h); [10,13].forEach(i=>push(P[i],mF,1.2*h)); }
    else { const sh=side==='L'?3:6; push(P[sh],mF,-2.2*h); [10,13].forEach(i=>push(P[i],mF,1.3*h)); }
  }
  function muscles(r){
    const L=r.living, P=r.pts, life=Math.max(0,Math.min(1,L.bleed/7)), str=.3+.7*life;
    if(L.age<.8) return;                                    // the fall itself is pure physics
    mUp.copy(P[1].c).sub(P[2].c).normalize(); mR.copy(P[6].c).sub(P[3].c).normalize(); mF.crossVectors(mR,mUp).normalize();
    const prone=mF.y<-.3, supine=mF.y>.3;
    // the wound, on the front of the body
    mA.copy(P[L.w[0]].c).lerp(P[L.w[1]].c,L.w[2]).addScaledVector(mF,.09);
    const crawling=prone && L.mode==='crawl' && L.age>1.8;
    const reachHand=crawling?L.crawlHands[L.reach%L.crawlHands.length]:-1;
    // one hand (both when not crawling) presses on the wound
    [L.clutch, L.crawlHands.length>1?8:-1].forEach((hd,k)=>{ if(hd<0||hd===reachHand||(k===1&&crawling)) return; if(hd===L.clutch||!crawling){
      mB.copy(mA).addScaledVector(mR,(hd===5?-1:1)*.05); pullTo(P[hd],mB,170*str); damp(P[hd],.12); } });
    // kicks and squirming
    if(Math.random()<.01*str){ const i=[10,11,13,14][Math.floor(Math.random()*4)]; mD.randomDirection(); mD.y=Math.abs(mD.y)*.6; push(P[i],mD,2.2*str*SIM_H); }
    if(Math.random()<.004*str){ mD.copy(mR).multiplyScalar(Math.random()<.5?1:-1); push(P[1],mD,1.2*str*SIM_H); }
    // head lifts to look around
    if(prone||supine) accel(P[0],UPV,13*str);
    if(crawling){
      // hand over hand: reach ahead and plant, then haul the body toward the planted hand
      mC.set(C.headPos.x-P[2].c.x,0,C.headPos.z-P[2].c.z).normalize(); if(L.crawlAway) mC.negate();
      mD.set(mUp.x,0,mUp.z).normalize().lerp(mC,.45).normalize();
      const hd=P[reachHand], ph=L.cT%1.1;
      if(ph<.5){ mB.copy(P[1].c).addScaledVector(mD,.55); mB.y=C.groundAt(mB.x,mB.z,P[1].c.y)+.06; pullTo(hd,mB,260*str); damp(hd,.1); }
      else { hd.o.copy(hd.c); accel(P[1],mD,10*str); accel(P[3],mD,8*str); accel(P[6],mD,8*str); accel(P[2],mD,4.5*str); accel(P[1],UPV,4*str); }
    } else if(supine && L.age>2){
      // on its back: try to roll over every few seconds
      const ph=L.rollT%3.2;
      if(ph<.55){ const sh=Math.floor(L.rollT/3.2)%2?3:6, other=sh===3?6:3; mD.copy(P[other].c).sub(P[sh].c).normalize();
        accel(P[sh],UPV,26*str); accel(P[sh],mD,14*str); accel(sh===3?P[9]:P[12],mD,8*str); }
    }
  }
  function livingTick(r,dt){
    const L=r.living, P=r.pts; L.age+=dt; L.bleed-=dt; L.cT+=dt; L.rollT+=dt;
    if(L.cT%1.1<dt) L.reach++;
    r.asleep=false; r.still=0; C.unbakeRag(r);
    const life=Math.max(0,Math.min(1,L.bleed/7)), pv=P[2].c, d=Math.hypot(Math.hypot(C.headPos.x-pv.x,C.headPos.z-pv.z),C.headPos.y-pv.y);
    L.faceT-=dt;
    if(L.faceT<=0){ L.faceT=.5+Math.random()*1.2; r.face.material=C.faceMats[d<2.6&&!L.crawlAway&&Math.random()<.5?'plead':Math.random()<.65?'agony':'pain']; }
    L.moanT-=dt;
    if(L.moanT<=0){ L.moanT=(1.3+Math.random()*2)*(1.6-life*.6); C.sfxMoan(d,L.pitch*(.85+life*.15),pv.clone()); }
    L.trailT-=dt;
    if(L.trailT<=0){ L.trailT=.5+Math.random()*.4; C.decal(pv,UPV,.2+Math.random()*.22,1.5,'pool'); }
    if(Math.random()<dt*4){ mA.copy(P[L.w[0]].c).lerp(P[L.w[1]].c,L.w[2]); C.spray(mA,UPV,1,.7,.8); }
    if(L.bleed<=0){ r.living=null; r.face.material=C.faceMats.dead; r.twitchT=.9; C.onBledOut(r); }
  }
  function removeRagdoll(r){ if(r.baked){ C.scene.remove(r.baked); r.baked.traverse(o=>{ if(o.geometry) o.geometry.dispose(); }); r.baked=null; }
    C.scene.remove(r.g); { const i=ragdolls.indexOf(r); if(i>=0) ragdolls.splice(i,1); }
    C.removeHittables(new Set([r.torso,...r.segs.map(s=>s.m)]));
  }
  function impulse(r,point,dir,strength){
    r.asleep=false; r.still=0; C.unbakeRag(r);
    r.pts.forEach(p=>{ const w=Math.max(0,1-p.c.distanceTo(point)/.55); const k=strength*(.12+w*.88)*SIM_H;
      p.o.x-=dir.x*k; p.o.y-=(dir.y*.5-.15*w)*k; p.o.z-=dir.z*k; });
  }
  function sever(r,key,dir){
    if(r.severed.has(key)) return false;
    const S=SEVER[key], sub=new Set(S.sub), at=S.at;
    r.severed.add(key);
    const np=r.pts.length, src=r.pts[at]; r.pts.push({c:src.c.clone(),o:src.o.clone()});
    r.cons=r.cons.filter(c=>{
      const ia=sub.has(c.a), ib=sub.has(c.b); if(ia===ib) return true;
      if(c.a===at&&ib){ c.a=np; return true; } if(c.b===at&&ia){ c.b=np; return true; } return false; });
    r.segs.forEach(sg=>{ if(sg.a===at&&sub.has(sg.b)) sg.a=np; if(sg.b===at&&sub.has(sg.a)) sg.b=np; });
    const kick=(key==='head'?7.5:5)*SIM_H;
    [...S.sub,np].forEach(i=>{ const p=r.pts[i]; p.o.x-=dir.x*kick; p.o.z-=dir.z*kick; p.o.y-=(key==='head'?3:1.5)*SIM_H; });
    [at,np].forEach(i=>{ const m=new THREE.Mesh(C.boxGeo(.12*r.s,.12*r.s,.12*r.s),C.stumpMat); r.g.add(m); r.stumps.push({i,m}); });
    r.emitters.push({i:at,from:S.from,life:key==='head'?2.2:1.4,acc:0});
    r.emitters.push({i:np,from:S.sub[0],life:.8,acc:0});
    if(key==='head') r.headOn=false;
    C.spray(r.pts[at].c,vS.copy(dir).negate().add(Y),26,4,.6); C.mist(r.pts[at].c,.7);
    C.sfxCrunch(); C.sfxSpurt();
    r.asleep=false; r.still=0; C.unbakeRag(r);
    return true;
  }
  function stepRag(r){
    if(r.living) muscles(r);
    else if(r.twitchT>0 && Math.random()<.06){ const p=r.pts[[4,5,7,8,10,11,13,14][Math.floor(Math.random()*8)]]; mD.randomDirection(); push(p,mD,.9*Math.min(1,r.twitchT)*SIM_H); }
    const P=r.pts, g=GRAV*SIM_H*SIM_H;
    for(let i=0;i<P.length;i++){ const p=P[i];
      const vx=(p.c.x-p.o.x)*.995, vy=(p.c.y-p.o.y)*.995, vz=(p.c.z-p.o.z)*.995;
      p.o.copy(p.c); p.c.x+=vx; p.c.y+=vy+g; p.c.z+=vz; }
    for(let it=0;it<8;it++){
      for(let k=0;k<r.cons.length;k++){ const c=r.cons[k], a=P[c.a].c, b=P[c.b].c;
        const dx=b.x-a.x, dy=b.y-a.y, dz=b.z-a.z, d=Math.sqrt(dx*dx+dy*dy+dz*dz)||1e-4;
        if(c.min && d>=c.rest) continue;
        const f=(d-c.rest)/d*.5; a.x+=dx*f; a.y+=dy*f; a.z+=dz*f; b.x-=dx*f; b.y-=dy*f; b.z-=dz*f; }
      for(let i=0;i<P.length;i++){ const p=P[i];
        const gy=C.groundAt(p.c.x,p.c.z,p.c.y)+.06;
        if(p.c.y<gy){ p.c.y=gy; p.o.x=p.c.x-(p.c.x-p.o.x)*.55; p.o.z=p.c.z-(p.c.z-p.o.z)*.55; }
        C.pushOut(p.c,.06,p.c.y,0); }
    }
  }
  function orient(m,a,b,rightRef){
    m.position.copy(a).add(b).multiplyScalar(.5);
    by.copy(b).sub(a); const len=by.length(); if(len<1e-5) return; by.divideScalar(len);
    if(rightRef){ bx.copy(rightRef); bx.addScaledVector(by,-bx.dot(by)); if(bx.lengthSq()>1e-6){ bx.normalize(); bz.crossVectors(bx,by); basis.makeBasis(bx,by,bz); m.quaternion.setFromRotationMatrix(basis); return; } }
    m.quaternion.setFromUnitVectors(Y,by);
  }
  const rightV=new THREE.Vector3(), negR=new THREE.Vector3(), tmpA=new THREE.Vector3(), tmpB=new THREE.Vector3();
  function renderRagdoll(r){
    const P=r.pts;
    rightV.copy(P[6].c).sub(P[3].c);
    tmpA.copy(P[3].c).add(P[6].c).multiplyScalar(.5); tmpB.copy(P[9].c).add(P[12].c).multiplyScalar(.5);
    orient(r.torso,tmpB,tmpA,rightV);
    negR.copy(rightV).negate();
    r.segs.forEach(sg=>orient(sg.m,P[sg.a].c,P[sg.b].c,sg.part==='head'?(r.headOn?rightV:null):negR));
    r.stumps.forEach(st=>st.m.position.copy(P[st.i].c));
  }
  function updateRagdoll(r,dt){
    r.age+=dt;
    for(let k=r.emitters.length-1;k>=0;k--){ const em=r.emitters[k]; em.life-=dt; em.acc+=dt*(40+em.life*30);
      const d=vS.copy(r.pts[em.i].c).sub(r.pts[em.from].c).normalize();
      while(em.acc>=1){ em.acc--; C.spray(r.pts[em.i].c,d,1,2+Math.random()*2.5*Math.min(1,em.life),.35); }
      if(em.life<=0) r.emitters.splice(k,1); }
    if(r.living) livingTick(r,dt);
    if(r.twitchT>0) r.twitchT-=dt;
    if(r.asleep) return;
    r.acc+=dt; let n=0; while(r.acc>=SIM_H&&n<5){ stepRag(r); r.acc-=SIM_H; n++; } if(n===5) r.acc=0;
    // a body that comes to rest kneeling or sitting tips over
    if(r.age<5){ const pv=r.pts[2].c, nk=r.pts[1].c, gy=C.groundAt(pv.x,pv.z,pv.y);
      if(pv.y-gy>.3*r.s){ if(!r.topple){ const a=Math.random()*6.28; r.topple=new THREE.Vector3(Math.sin(a),0,Math.cos(a)); }
        const k=2.4*SIM_H*Math.min(1,dt*20);
        [[1,1],[0,1],[3,.8],[6,.8],[2,.6]].forEach(([i,w])=>{ r.pts[i].o.x-=r.topple.x*k*w; r.pts[i].o.z-=r.topple.z*k*w; });
        r.pts[2].o.y+=k*.5; r.still=0; } }
    let motion=0; r.pts.forEach(p=>{ motion+=Math.abs(p.c.x-p.o.x)+Math.abs(p.c.y-p.o.y)+Math.abs(p.c.z-p.o.z); });
    if(dt>0 && motion/r.pts.length<.0008) r.still+=dt; else r.still=0;
    if(r.still>.7 && r.age>1 && !r.living && !(r.twitchT>0)){ r.asleep=true; C.bakeRag(r);
      if(!r.puddle){ r.puddle=true; tmpA.copy(r.pts[2].c).add(r.pts[1].c).multiplyScalar(.5); C.decal(tmpA,UPV,.9*r.s+Math.random()*.4,5,'pool');
        if(!r.headOn){ C.decal(r.pts[1].c,UPV,.6,4,'pool'); C.decal(r.pts[0].c,UPV,.35,3,'pool'); } } }
    renderRagdoll(r);
  }

  return { ragdolls, makeRagdoll, removeRagdoll, impulse, sever, updateRagdoll, renderRagdoll, SIM_H };
}
