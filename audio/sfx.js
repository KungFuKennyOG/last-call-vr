// The shared sound effects: guns, hits, gore, movement, bullet time. Each one builds its own little synth graph and plays now.
// Positional ones take a world position (pos) and come from there.
import { actx, sfxBus, now, osc, noise, filt, gain, env, outAt } from './core.js';

export function sfxShot(){ if(!actx) return; const t=now();
  const n=noise(t,.45), f=filt('lowpass',3000,.7), g=gain(); env(g,t,.001,.9,.32); n.connect(f).connect(g).connect(sfxBus);
  const n2=noise(t,.06), f2=filt('highpass',4000), g2=gain(); env(g2,t,.001,.5,.04); n2.connect(f2).connect(g2).connect(sfxBus);
  const o=osc('sine',140,t,.2); o.frequency.exponentialRampToValueAtTime(38,t+.16); const g3=gain(); env(g3,t,.001,.9,.18); o.connect(g3).connect(sfxBus);
  // concrete slapback
  const n3=noise(t+.09,.3), f3=filt('bandpass',900,.8), g4=gain(); env(g4,t+.09,.01,.18,.28); n3.connect(f3).connect(g4).connect(sfxBus); }
export function sfxSplat(){ if(!actx) return; const t=now();
  const n=noise(t,.25), f=filt('lowpass',900,1.5), g=gain(); env(g,t,.003,.6,.18); n.connect(f).connect(g).connect(sfxBus);
  const o=osc('sine',85,t,.15); o.frequency.exponentialRampToValueAtTime(45,t+.12); const g2=gain(); env(g2,t,.002,.5,.12); o.connect(g2).connect(sfxBus); }
export function sfxCrunch(){ if(!actx) return; const t=now();
  for(let k=0;k<3;k++){ const tt=t+k*.018, n=noise(tt,.05), f=filt('bandpass',500+Math.random()*700,4), g=gain(); env(g,tt,.001,.7,.04); n.connect(f).connect(g).connect(sfxBus); }
  sfxSplat(); }
export function sfxSpurt(){ if(!actx) return; const t=now(); const n=noise(t,.9), f=filt('bandpass',700,2); f.frequency.linearRampToValueAtTime(350,t+.8); const g=gain(); env(g,t,.02,.25,.8); n.connect(f).connect(g).connect(sfxBus); }
export function sfxThud(){ if(!actx) return; const t=now(); const o=osc('sine',70,t,.2); o.frequency.exponentialRampToValueAtTime(35,t+.15); const g=gain(); env(g,t,.002,.35,.15); o.connect(g).connect(sfxBus); }
export function sfxRicochet(){ if(!actx) return; const t=now(); const n=noise(t,.08), f=filt('bandpass',2500,3), g=gain(); env(g,t,.001,.4,.06); n.connect(f).connect(g).connect(sfxBus);
  const o=osc('sine',3200+Math.random()*1500,t,.25); o.frequency.exponentialRampToValueAtTime(1200,t+.22); const g2=gain(); env(g2,t,.002,.07,.2); o.connect(g2).connect(sfxBus); }
export function sfxDeflect(){ if(!actx) return; const t=now(); const o=osc('sine',2600,t,.2); o.frequency.exponentialRampToValueAtTime(1300,t+.15); const g=gain(); env(g,t,.002,.25,.16); o.connect(g).connect(sfxBus); }
export function sfxHurt(){ if(!actx) return; const t=now(); const o=osc('sawtooth',150,t,.45); o.frequency.exponentialRampToValueAtTime(38,t+.4); const lp=filt('lowpass',900), g=gain(); env(g,t,.003,.7,.4); o.connect(lp).connect(g).connect(sfxBus); }
export function sfxEmpty(){ if(!actx) return; const t=now(); const o=osc('square',900,t,.03), g=gain(); env(g,t,.001,.1,.015); o.connect(g).connect(sfxBus); }
export function sfxReload(){ if(!actx) return; const t=now();
  [0,.09].forEach(dt=>{ const n=noise(t+dt,.05), f=filt('bandpass',3200,3), g=gain(); env(g,t+dt,.001,.5,.03); n.connect(f).connect(g).connect(sfxBus); });
  const o=osc('sine',500,t,.2); o.frequency.exponentialRampToValueAtTime(1300,t+.16); const g=gain(); env(g,t,.005,.12,.15); o.connect(g).connect(sfxBus); }
export function sfxEnemyShot(pos){ if(!actx) return; const t=now(); const n=noise(t,.3), f=filt('bandpass',1200,.8), g=gain(); env(g,t,.001,.4,.25); n.connect(f).connect(g).connect(outAt(pos)); }
export function sfxSwing(pos){ if(!actx) return; const t=now(); const n=noise(t,.25), f=filt('bandpass',900,1); f.frequency.exponentialRampToValueAtTime(2400,t+.2); const g=gain(); env(g,t,.02,.25,.18); n.connect(f).connect(g).connect(outAt(pos)); }
export function sfxDoor(pos){ if(!actx) return; const t=now(); const out=outAt(pos); const o=osc('sine',55,t,.6); const g=gain(); env(g,t,.01,.3,.55); const n=noise(t,.4), f=filt('lowpass',400), g2=gain(); env(g2,t,.01,.25,.35);
  o.connect(g).connect(out); n.connect(f).connect(g2).connect(out); }
export function sfxWhoosh(){ if(!actx) return; const t=now(); const n=noise(t,.7), f=filt('bandpass',300,1.5); f.frequency.exponentialRampToValueAtTime(2600,t+.6); const g=gain(); env(g,t,.05,.35,.55); n.connect(f).connect(g).connect(sfxBus); }
export function sfxStreak(){ if(!actx) return; const t=now(); [196,261.63].forEach((f,k)=>{ const tt=t+k*.07, o=osc('square',f,tt,.12), g=gain(); env(g,tt,.002,.07,.1); o.connect(g).connect(sfxBus); }); }
export function sfxWhack(){ if(!actx) return; const t=now();
  const o=osc('sine',110,t,.2); o.frequency.exponentialRampToValueAtTime(40,t+.15); const g=gain(); env(g,t,.001,1,.16); o.connect(g).connect(sfxBus);
  const n=noise(t,.08), f=filt('bandpass',1700,1.5), g2=gain(); env(g2,t,.001,.8,.06); n.connect(f).connect(g2).connect(sfxBus);
  const n2=noise(t+.01,.05), f2=filt('highpass',3500), g3=gain(); env(g3,t+.01,.001,.35,.04); n2.connect(f2).connect(g3).connect(sfxBus); }
export function sfxMoan(dist,pitch,pos){ if(!actx) return; const t=now(), dur=.7+Math.random()*.7, v=.32/(1+dist*.35);
  const o=osc('sawtooth',pitch,t,dur); o.frequency.linearRampToValueAtTime(pitch*(.78+Math.random()*.12),t+dur);
  const lfo=osc('sine',5+Math.random()*3,t,dur), lg=gain(); lg.gain.value=pitch*.04; lfo.connect(lg).connect(o.frequency);
  const g=gain(); g.gain.setValueAtTime(.0001,t); g.gain.exponentialRampToValueAtTime(v,t+.18); g.gain.setValueAtTime(v,t+dur*.6); g.gain.exponentialRampToValueAtTime(.0001,t+dur);
  [[650,6],[1050,8],[2400,10]].forEach(([fq,q],k)=>{ const b=filt('bandpass',fq*(.9+Math.random()*.2),q), bg=gain(); bg.gain.value=k===2?.3:1; o.connect(b).connect(bg).connect(g); });
  g.connect(pos?outAt(pos):sfxBus); }
export function sfxGlass(pos){ if(!actx) return; const t=now(), out=outAt(pos);
  const n=noise(t,.35), f=filt('highpass',3000), g=gain(); env(g,t,.001,.45,.3); n.connect(f).connect(g).connect(out);
  for(let k=0;k<5;k++){ const tt=t+k*.02, o=osc('sine',2500+Math.random()*3500,tt,.2), gg=gain(); env(gg,tt,.002,.1,.18); o.connect(gg).connect(out); } }
export function sfxMG(){ if(!actx) return; const t=now();
  const n=noise(t,.14), f=filt('lowpass',4200,.7), g=gain(); env(g,t,.001,.75,.09); n.connect(f).connect(g).connect(sfxBus);
  const o=osc('sine',170,t,.1); o.frequency.exponentialRampToValueAtTime(55,t+.07); const g2=gain(); env(g2,t,.001,.6,.07); o.connect(g2).connect(sfxBus); }
export function sfxShotgun(){ if(!actx) return; const t=now();
  const n=noise(t,.7), f=filt('lowpass',2300,.6), g=gain(); env(g,t,.001,1.1,.5); n.connect(f).connect(g).connect(sfxBus);
  const o=osc('sine',95,t,.35); o.frequency.exponentialRampToValueAtTime(28,t+.3); const g2=gain(); env(g2,t,.001,1.1,.3); o.connect(g2).connect(sfxBus);
 }
export function sfxBreak(){ if(!actx) return; const t=now(); [[0,1800],[.22,900],[.5,2600],[.62,3200]].forEach(([dt,f])=>{ const c=noise(t+dt,.06), cf=filt('bandpass',f,3), cg=gain(); env(cg,t+dt,.001,.5,.045); c.connect(cf).connect(cg).connect(sfxBus); }); }
export function sfxRack(){ if(!actx) return; const t=now(); [0,.07,.16].forEach(dt=>{ const c=noise(t+dt,.05), cf=filt('bandpass',2000+dt*6000,3), cg=gain(); env(cg,t+dt,.001,.5,.04); c.connect(cf).connect(cg).connect(sfxBus); }); }
export function sfxJump(dbl){ if(!actx) return; const t=now(); const n=noise(t,.2), f=filt('bandpass',dbl?900:600,1.2); f.frequency.exponentialRampToValueAtTime(dbl?2200:1400,t+.15); const g=gain(); env(g,t,.01,.18,.15); n.connect(f).connect(g).connect(sfxBus); }
export function sfxDash(){ if(!actx) return; const t=now(); const n=noise(t,.3), f=filt('bandpass',2600,1.5); f.frequency.exponentialRampToValueAtTime(500,t+.25); const g=gain(); env(g,t,.005,.4,.24); n.connect(f).connect(g).connect(sfxBus);
  const o=osc('sine',140,t,.2); o.frequency.exponentialRampToValueAtTime(60,t+.18); const g2=gain(); env(g2,t,.003,.3,.16); o.connect(g2).connect(sfxBus); }
export function sfxSlide(){ if(!actx) return; const t=now(); const n=noise(t,.8), f=filt('lowpass',1100,1), g=gain(); g.gain.setValueAtTime(.25,t); g.gain.exponentialRampToValueAtTime(.001,t+.8); n.connect(f).connect(g).connect(sfxBus); }
export function sfxLand(impact){ if(!actx) return; const t=now(), v=Math.min(.7,impact*.05); const o=osc('sine',90,t,.2); o.frequency.exponentialRampToValueAtTime(40,t+.15); const g=gain(); env(g,t,.002,v,.16); o.connect(g).connect(sfxBus); }
export function sfxPad(){ if(!actx) return; const t=now(); const o=osc('sine',60,t,.5); o.frequency.exponentialRampToValueAtTime(180,t+.35); const g=gain(); env(g,t,.005,.6,.45); o.connect(g).connect(sfxBus);
  const n=noise(t,.7), f=filt('bandpass',400,1.5); f.frequency.exponentialRampToValueAtTime(3000,t+.6); const g2=gain(); env(g2,t,.02,.35,.6); n.connect(f).connect(g2).connect(sfxBus); }
export function sfxStomp(){ if(!actx) return; const t=now(); const o=osc('sine',80,t,.7); o.frequency.exponentialRampToValueAtTime(24,t+.6); const g=gain(); env(g,t,.003,1.1,.6); o.connect(g).connect(sfxBus);
  const n=noise(t,.5), f=filt('lowpass',700), g2=gain(); env(g2,t,.003,.6,.45); n.connect(f).connect(g2).connect(sfxBus); }
export function sfxBTIn(){ if(!actx) return; const t=now(); const o=osc('sine',320,t,.7); o.frequency.exponentialRampToValueAtTime(48,t+.6); const g=gain(); env(g,t,.01,.55,.6); o.connect(g).connect(sfxBus);
  const n=noise(t,.8), f=filt('lowpass',1800); f.frequency.exponentialRampToValueAtTime(200,t+.7); const g2=gain(); env(g2,t,.02,.3,.7); n.connect(f).connect(g2).connect(sfxBus); }
export function sfxBTOut(){ if(!actx) return; const t=now(); const o=osc('sine',60,t,.5); o.frequency.exponentialRampToValueAtTime(380,t+.4); const g=gain(); env(g,t,.01,.4,.45); o.connect(g).connect(sfxBus); }
