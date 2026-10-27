// Enemy body animation: walk cycle, aiming, lasting wounds (limp, dead arm, clutching the gut),
// the stagger after a fresh hit, and the face. Shared by every enemy in every mode.

// After the AI has moved e this frame. moving: walking or running; active: in the fight (not idle);
// limp: has a hurt leg and should show it; t: running clock in seconds.
export function poseBody(e, dt, t, moving, active, limp) {
  e.flinch=Math.max(0,e.flinch-dt*4);
  e.swing=Math.max(0,(e.swing||0)-dt*3);
  const gunUp=e.kind!=='rusher' && active && !moving ? (e.armHurt.R?.55:1) : 0;
  e.aim+=(gunUp-e.aim)*Math.min(1,dt*6);
  if(moving){
    e.walk+=dt*(e.kind==='rusher'?11:6.5); const sw=Math.sin(e.walk)*.6;
    e.legL.rotation.x=sw; e.legR.rotation.x=-sw;
    e.armL.rotation.x=e.kind==='rusher'?-1.2+sw*.3:-sw*.8;
    e.armR.rotation.x=e.kind==='rusher'?-1.2-sw*.3:sw*.8;
    e.torso.position.y=.86+Math.abs(Math.cos(e.walk))*.04;
  } else {
    e.legL.rotation.x*=.85; e.legR.rotation.x*=.85; e.torso.position.y=.86;
    e.armL.rotation.x=e.kind==='rusher'?-1.1-e.swing*.9:-.15;
    e.armR.rotation.x=e.kind==='rusher'?-1.1-e.swing*1.2:-.1-e.aim*1.45-e.swing*1.6;
  }
  const kb=moving?1:0; e.shinL.rotation.x=kb*Math.max(0,Math.sin(e.walk+1.3))*.95; e.shinR.rotation.x=kb*Math.max(0,Math.sin(e.walk+1.3+Math.PI))*.95;
  e.foreL.rotation.x=e.kind==='rusher'&&moving?-.9:-.32; e.foreR.rotation.x=e.kind==='rusher'&&moving?-.9:-.32*(1-e.aim)-e.swing*.4;
  // lasting damage: a limp on a hurt leg, a dead arm, a hand pressed to a gut wound
  let dip=0;
  if(limp&&moving){ const hs=e.legHurt.L?1:-1; dip=Math.max(0,Math.sin(e.walk)*hs)*.08; (e.legHurt.L?e.legL:e.legR).rotation.x*=.4; }
  if(e.armHurt.L){ e.armL.rotation.x=e.armL.rotation.x*.25+.12+Math.sin(t*2+e.strafe)*.05; e.foreL.rotation.x=-.08; }
  if(e.armHurt.R&&e.kind==='rusher'){ e.armR.rotation.x=.12; e.foreR.rotation.x=-.08; }
  const clutch=e.gutHurt&&!e.armHurt.L;
  if(clutch){ e.armL.rotation.x=-.5; e.foreL.rotation.x=-1.55; }
  e.armL.rotation.z=clutch?.42:0; e.armR.rotation.z=0; e.head.rotation.x=0;
  let tx=-e.flinch*.15+(e.gutHurt?.26:0), ty=0, tz=0, drop=dip;
  // a fresh wound: a big pose that snaps in, holds, and eases back out
  const rc=e.react;
  if(rc){ rc.t+=dt; const k=rc.t/rc.dur;
    if(k>=1) e.react=null;
    else { const a=k<.1?k/.1:k<.35?1:Math.pow(1-(k-.35)/.65,1.5), sd=rc.side==='L'?-1:1, mix=(o,v)=>o*(1-a)+v*a;
      if(rc.type==='gut'){ tx+=1.05*a; drop+=.12*a; e.head.rotation.x=.4*a;
        e.armL.rotation.x=mix(e.armL.rotation.x,-.75); e.armR.rotation.x=mix(e.armR.rotation.x,-.75); e.armL.rotation.z=.55*a; e.armR.rotation.z=-.55*a;
        e.foreL.rotation.x=mix(e.foreL.rotation.x,-1.45); e.foreR.rotation.x=mix(e.foreR.rotation.x,-1.45);
        e.legL.rotation.x=mix(e.legL.rotation.x,-.3); e.legR.rotation.x=mix(e.legR.rotation.x,-.3); e.shinL.rotation.x=mix(e.shinL.rotation.x,.6); e.shinR.rotation.x=mix(e.shinR.rotation.x,.6); }
      if(rc.type==='chest'){ tx-=.65*a; ty+=rc.sx*.4*a; e.head.rotation.x=-.65*a; e.armL.rotation.z=-1*a; e.armR.rotation.z=1*a;
        e.armL.rotation.x=mix(e.armL.rotation.x,.6); e.armR.rotation.x=mix(e.armR.rotation.x,.6); e.legL.rotation.x=mix(e.legL.rotation.x,.25); }
      if(rc.type==='arm'){ const arm=rc.side==='L'?e.armL:e.armR, fore=rc.side==='L'?e.foreL:e.foreR;
        arm.rotation.x=mix(arm.rotation.x,1.6); arm.rotation.z=sd*.8*a; fore.rotation.x=mix(fore.rotation.x,0); ty+=sd*.85*a; tz-=sd*.18*a; e.head.rotation.x=-.2*a; }
      if(rc.type==='leg'){ // down onto the hurt knee, a hand on the leg
        const hl=rc.side==='L', thH=hl?e.legL:e.legR, shH=hl?e.shinL:e.shinR, thO=hl?e.legR:e.legL, shO=hl?e.shinR:e.shinL, hand=hl?e.armL:e.armR, fore=hl?e.foreL:e.foreR;
        drop+=.42*a; thH.rotation.x=mix(thH.rotation.x,-.1); shH.rotation.x=mix(shH.rotation.x,1.6); thO.rotation.x=mix(thO.rotation.x,-1.3); shO.rotation.x=mix(shO.rotation.x,1.35);
        tx+=.35*a; hand.rotation.x=mix(hand.rotation.x,-.35); hand.rotation.z=(hl?.25:-.25)*a; fore.rotation.x=mix(fore.rotation.x,-.6); e.head.rotation.x=.3*a; }
    } }
  e.inner.position.y=-drop;
  if(e.dodgeT>0) tz+=e.dodgeSd*.45;
  e.torso.rotation.x=tx; e.torso.rotation.y=ty; e.torso.rotation.z=tz;
  if(e.glint){ e.glint.visible=e.aiming; if(e.aiming) e.glint.scale.setScalar(.2+Math.abs(Math.sin(t*30))*.25); }
}

// Picks the expression: pain when hurt or stunned, scared near a death, screaming rushers, angry when aiming, blinking.
export function faceExpression(e, dt, moving, active, setExpr) {
  e.scaredT-=dt; e.blinkT-=dt; if(e.blinkT<=-.12) e.blinkT=2+Math.random()*3.5;
  let ex;
  if(e.flinch>.25||e.stunT>0) ex='pain';
  else if(e.scaredT>0) ex='scared';
  else if(e.kind==='rusher' && moving && active) ex='scream';
  else if(active && (e.aiming||e.los)) ex='angry';
  else ex='neutral';
  if((ex==='neutral'||ex==='angry') && e.blinkT<0) ex+='_blink';
  setExpr(e,ex);
}
