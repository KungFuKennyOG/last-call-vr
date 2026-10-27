// Audio: one Web Audio context, the master chain (compressor, a low-pass that muffles during slow-mo), a quiet room tone,
// and the little building blocks every synthesized sound is made of. All sound in both games is generated, no samples.
// actx, sfxBus, lowpass and noiseBuf are live: they're null until startAudio runs (it needs a click or tap first).

export let actx = null, sfxBus, lowpass, noiseBuf;

// Call from a user gesture. The first call builds the graph and then runs onCreate (the game starts its music there);
// later calls just resume a suspended context.
export function startAudio(onCreate) {
  if (actx) { if (actx.state === 'suspended') actx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  actx = new AC();
  const master = actx.createGain(); master.gain.value = .9;
  const comp = actx.createDynamicsCompressor(); comp.threshold.value = -12; comp.ratio.value = 4;
  lowpass = actx.createBiquadFilter(); lowpass.type = 'lowpass'; lowpass.frequency.value = 18000; lowpass.Q.value = 2;
  sfxBus = actx.createGain(); sfxBus.gain.value = .75;
  sfxBus.connect(lowpass); lowpass.connect(comp); comp.connect(master); master.connect(actx.destination);
  noiseBuf = actx.createBuffer(1, actx.sampleRate * 2, actx.sampleRate);
  const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  // room tone: a big hall breathing
  const tone = actx.createBufferSource(); tone.buffer = noiseBuf; tone.loop = true;
  const tf = filt('lowpass', 160, 1), tg = gain(); tg.gain.value = .07; tone.connect(tf).connect(tg).connect(lowpass); tone.start();
  if (onCreate) onCreate();
}

// slow-mo and bullet time muffle everything; harder during a burst (slowed) than in plain bullet time
export function setMuffle(on, slowed) { if (!actx) return; lowpass.frequency.setTargetAtTime(on ? (slowed ? 650 : 1300) : 18000, actx.currentTime, .08); }

// the listener follows your head
export function updateListener(headPos, headDir) {
  if (!actx) return;
  const Ls = actx.listener;
  if (Ls.positionX) { Ls.positionX.value = headPos.x; Ls.positionY.value = headPos.y; Ls.positionZ.value = headPos.z; Ls.forwardX.value = headDir.x; Ls.forwardY.value = headDir.y; Ls.forwardZ.value = headDir.z; Ls.upX.value = 0; Ls.upY.value = 1; Ls.upZ.value = 0; }
  else { Ls.setPosition(headPos.x, headPos.y, headPos.z); Ls.setOrientation(headDir.x, headDir.y, headDir.z, 0, 1, 0); }
}

/* ---------- building blocks ---------- */
export const now = () => actx.currentTime;
export function makeIR(sec,decay){ const len=Math.floor(actx.sampleRate*sec), b=actx.createBuffer(2,len,actx.sampleRate);
  for(let ch=0;ch<2;ch++){ const d=b.getChannelData(ch); for(let i=0;i<len;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/len,decay); } return b; }
export function clipper(k){ const sh=actx.createWaveShaper(), c=new Float32Array(2048); for(let i=0;i<2048;i++){ const x=i/1023.5-1; c[i]=Math.tanh(x*k); } sh.curve=c; return sh; }
export function env(g,t,a,peak,d){ g.gain.setValueAtTime(.0001,t); g.gain.exponentialRampToValueAtTime(peak,t+a); g.gain.exponentialRampToValueAtTime(.0001,t+a+d); }
export function osc(type,f,t,dur){ const o=actx.createOscillator(); o.type=type; o.frequency.setValueAtTime(f,t); o.start(t); o.stop(t+dur+.05); return o; }
export function noise(t,dur){ const s=actx.createBufferSource(); s.buffer=noiseBuf; s.start(t,Math.random()*1.2); s.stop(t+dur); return s; }
export function filt(type,f,q){ const b=actx.createBiquadFilter(); b.type=type; b.frequency.value=f; if(q) b.Q.value=q; return b; }
export function gain(){ return actx.createGain(); }
export function outAt(pos){ if(!pos||!actx) return sfxBus; const p=actx.createPanner(); p.panningModel='HRTF'; p.distanceModel='inverse'; p.refDistance=1.6; p.rolloffFactor=1;
  if(p.positionX){ p.positionX.value=pos.x; p.positionY.value=pos.y; p.positionZ.value=pos.z; } else p.setPosition(pos.x,pos.y,pos.z); p.connect(sfxBus); return p; }
