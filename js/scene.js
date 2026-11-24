/* ==========================================================
   scene.js — the scroll-linked 3D neutrophil
   ==========================================================
   Nothing in this file needs editing to change site content.
   The two knobs worth knowing about:
     · scroll length  -> #zone height in css/site.css
     · choreography   -> the KEYS table below
   ========================================================== */

let animate = null, onScroll = null;
try {
  const A = await import('https://cdn.jsdelivr.net/npm/animejs@4/+esm');
  animate = A.animate; onScroll = A.onScroll;
} catch (e) { /* the scene still runs; scroll is then tracked manually */ }

const TAU = Math.PI * 2;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = t => t * t * (3 - 2 * t);

/* --- the effector programme as six keyframes on 0 -> 1 --- */
const KEYS = [
  { at: 0,    rotY: 0,          tilt:  .12, bloom: 118, ruffle: .30, reach: 0,   pdist: 430, engulf: 0, burst: 0,   nets: 0, grad: 1,   fade: 1   },
  { at: .18,  rotY: TAU *  .32, tilt:  .20, bloom: 122, ruffle: .55, reach: .08, pdist: 300, engulf: 0, burst: 0,   nets: 0, grad: 1,   fade: .05 },
  { at: .38,  rotY: TAU *  .68, tilt:  .08, bloom: 126, ruffle: .72, reach: .52, pdist: 148, engulf: 0, burst: 0,   nets: 0, grad: .55, fade: 0   },
  { at: .58,  rotY: TAU * 1.04, tilt: -.06, bloom: 132, ruffle: .48, reach: .14, pdist:  26, engulf: 1, burst: .12, nets: 0, grad: .22, fade: 0   },
  { at: .78,  rotY: TAU * 1.38, tilt:  .09, bloom: 142, ruffle: .92, reach: 0,   pdist:   0, engulf: 1, burst: 1,   nets: 0, grad: .08, fade: 0   },
  { at: 1,    rotY: TAU * 1.78, tilt:  .19, bloom: 152, ruffle: .42, reach: 0,   pdist:   0, engulf: 1, burst: .22, nets: 1, grad: 0,   fade: 0   }
];
function sample(p) {
  p = clamp(p);
  let i = 0; while (i < KEYS.length - 2 && p > KEYS[i + 1].at) i++;
  const a = KEYS[i], b = KEYS[i + 1];
  const t = smooth(clamp((p - a.at) / (b.at - a.at)));
  const o = {};
  for (const k in a) if (k !== 'at') o[k] = a[k] + (b[k] - a[k]) * t;
  return o;
}

const fib = n => {
  const out = [];
  for (let i = 0; i < n; i++) {
    const y = 1 - 2 * (i + .5) / n, r = Math.sqrt(Math.max(0, 1 - y * y)), th = i * 2.399963;
    out.push([r * Math.cos(th), y, r * Math.sin(th)]);
  }
  return out;
};
const noise = (x, y, z, t) =>
  Math.sin(x * 2.7 + t * .7) * Math.sin(y * 3.1 - t * .55) * Math.sin(z * 2.3 + t * .62);

export function initScene() {
  const cv = document.getElementById('stage');
  const zone = document.getElementById('zone');
  if (!cv || !zone) return;
  const ctx = cv.getContext('2d');

  /* --- scroll driver --- */
  const driver = { p: 0 };
  let usingAnime = false, scrollAnim = null, mismatch = 0;
  if (animate && onScroll) {
    try {
      scrollAnim = animate(driver, {
        p: 1, ease: 'linear', duration: 1000,
        autoplay: onScroll({ target: zone, enter: 'top top', leave: 'bottom bottom', sync: .14 })
      });
      usingAnime = true;
    } catch (e) { usingAnime = false; }
  }
  const toManual = () => { usingAnime = false; try { scrollAnim?.pause?.(); } catch (e) {} };
  const rawProgress = () => {
    const r = zone.getBoundingClientRect();
    return clamp(-r.top / Math.max(1, r.height - innerHeight));
  };

  /* --- canvas sizing --- */
  let W = 0, H = 0, DPR = 1, SC = 1;
  const resize = () => {
    DPR = Math.min(devicePixelRatio || 1, 2);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = W * DPR; cv.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    SC = clamp(Math.min(W, H) / 820, .55, 1.25);
  };
  addEventListener('resize', resize); resize();

  /* --- model, built once --- */
  const F = 900, CAM = 760;
  const BG = [247, 246, 242];
  const C_MEM = [58, 58, 72], C_NUC = [109, 40, 217], C_GRA = [194, 116, 10],
        C_PAT = [15, 118, 110], C_NET = [190, 18, 60];

  const MEM = fib(460);
  const TGT = (() => { const v = [1, .18, .34], m = Math.hypot(...v); return v.map(c => c / m); })();
  const LOBES = [[-34, -16, 6], [4, 16, -10], [38, -8, 12]];
  const LOBE_PTS = LOBES.map(() => fib(64));

  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const GRAN = [], GDIR = fib(96);
  for (let i = 0; i < 96; i++)
    GRAN.push({ d: GDIR[i], k: .28 + rnd() * .52,
                j: [rnd() - .5, rnd() - .5, rnd() - .5], sz: .7 + rnd() * .8 });
  const PAT = [];
  for (let i = 0; i < 24; i++) {
    const t = i / 23;
    PAT.push([(t - .5) * 46, Math.sin(t * Math.PI) * 11 - 2, Math.cos(t * 3) * 7]);
  }
  const NETS = [], NDIR = fib(15);
  for (let i = 0; i < 15; i++)
    NETS.push({ d: NDIR[i], ph: rnd() * TAU, bend: [rnd() - .5, rnd() - .5, rnd() - .5] });
  const MOTE = [];
  for (let i = 0; i < 70; i++)
    MOTE.push({ t: rnd(), o: [rnd() - .5, rnd() - .5, rnd() - .5], sp: .04 + rnd() * .09 });

  const buf = [];
  for (let i = 0; i < 1400; i++)
    buf.push({ kind: 0, z: 0, x: 0, y: 0, x2: 0, y2: 0, k: 0, c: C_MEM, a: 1, r: 1, w: 1, glow: 0 });

  /* --- pointer parallax --- */
  let mx = 0, my = 0, mxE = 0, myE = 0, idle = 0, last = performance.now();
  addEventListener('pointermove', e => {
    mx = (e.clientX / innerWidth - .5) * 2; my = (e.clientY / innerHeight - .5) * 2;
  });

  const caps = [...document.querySelectorAll('.caption')];
  const bands = caps.map((_, i) => [i / caps.length, (i + 1) / caps.length]);
  const pctEl = document.getElementById('pct');
  const trackEl = document.querySelector('#track i');
  const hero = document.querySelector('.hero');

  function frame(now) {
    const dt = Math.min(now - last, 50) / 1000; last = now;
    const raw = rawProgress();
    if (usingAnime) {
      if (raw > .03 && Math.abs(driver.p - raw) > .35) { if (++mismatch > 90) toManual(); }
      else mismatch = 0;
    }
    if (!usingAnime) driver.p += (raw - driver.p) * .12;

    const S = sample(driver.p);
    idle += dt * .16;
    mxE += (mx - mxE) * .05; myE += (my - myE) * .05;
    const T = now / 1000;

    const rotY = S.rotY + idle + mxE * .35, tilt = S.tilt + myE * .16;
    const cr = Math.cos(rotY), sr = Math.sin(rotY), ct = Math.cos(tilt), st = Math.sin(tilt);
    const ox = W / 2, oy = H / 2;
    const R = S.bloom * SC, burst = S.burst;

    const proj = (x, y, z) => {
      const X = x * cr + z * sr; let Z = -x * sr + z * cr;
      const Y = y * ct - Z * st; Z = y * st + Z * ct;
      const k = F / (F + CAM + Z);
      return [ox + X * k, oy + Y * k, Z, k];
    };

    let n = 0, zMin = Infinity, zMax = -Infinity;
    const push = o => {
      const it = buf[n++];
      it.glow = 0; it.w = 1; it.a = 1; it.x2 = 0; it.y2 = 0;
      Object.assign(it, o);
      if (it.z < zMin) zMin = it.z; if (it.z > zMax) zMax = it.z;
    };

    /* membrane */
    for (const d of MEM) {
      const dot = Math.max(0, d[0] * TGT[0] + d[1] * TGT[1] + d[2] * TGT[2]);
      const rr = R * (1 + S.ruffle * .16 * noise(d[0], d[1], d[2], T)
                        + S.reach * Math.pow(dot, 3)
                        + burst * .05 * noise(d[2], d[0], d[1], T * 2));
      const [x, y, z, k] = proj(d[0] * rr, d[1] * rr, d[2] * rr);
      push({ kind: 0, x, y, z, k, c: C_MEM, a: .5, r: 1.5 });
    }

    /* nucleus, decondensing as NETs form */
    const dec = S.nets;
    for (let l = 0; l < LOBES.length; l++) {
      const c0 = LOBES[l];
      for (const d of LOBE_PTS[l]) {
        const rr = (25 + dec * 30) * SC, g = 1 + dec * .5;
        const [x, y, z, k] = proj(c0[0] * SC * g + d[0] * rr,
                                  c0[1] * SC * g + d[1] * rr,
                                  c0[2] * SC * g + d[2] * rr);
        push({ kind: 0, x, y, z, k, c: C_NUC, a: .72 - dec * .3, r: 2.1 });
      }
    }

    /* granules */
    for (const g of GRAN) {
      const jj = burst * 26 * SC, rr = R * g.k * (1 + burst * .28);
      const [x, y, z, k] = proj(g.d[0] * rr + g.j[0] * jj,
                                g.d[1] * rr + g.j[1] * jj,
                                g.d[2] * rr + g.j[2] * jj);
      push({ kind: 0, x, y, z, k, c: C_GRA, a: .55 + burst * .45, r: 1.5 * g.sz, glow: burst });
    }

    /* pathogen */
    const pd = (S.pdist * SC) * (1 - S.engulf) + S.engulf * R * .34;
    const wob = Math.sin(T * 1.7) * 6 * (1 - S.engulf);
    for (const q of PAT) {
      const [x, y, z, k] = proj(TGT[0] * pd + q[0] * SC,
                                TGT[1] * pd + q[1] * SC + wob,
                                TGT[2] * pd + q[2] * SC);
      push({ kind: 0, x, y, z, k, c: C_PAT, a: .8 - S.engulf * .25, r: 2.3 });
    }

    /* chemokine gradient */
    if (S.grad > .01) {
      for (const m of MOTE) {
        m.t -= dt * m.sp; if (m.t < 0) m.t += 1;
        const dist = (R * 1.15 + m.t * 420) * SC;
        const [x, y, z, k] = proj(TGT[0] * dist + m.o[0] * 230 * SC,
                                  TGT[1] * dist + m.o[1] * 230 * SC,
                                  TGT[2] * dist + m.o[2] * 230 * SC);
        push({ kind: 0, x, y, z, k, c: C_PAT, a: S.grad * .32 * (1 - m.t), r: 1.1 });
      }
    }

    /* NET filaments */
    if (S.nets > .01) {
      for (const f of NETS) {
        const len = S.nets * 330 * SC;
        let prev = null;
        for (let s = 0; s <= 9; s++) {
          const t = s / 9, L = 40 * SC + t * len;
          const w = Math.sin(t * 5 + f.ph + T * 1.2) * 26 * SC * t;
          const [x, y, z, k] = proj(f.d[0] * L + f.bend[0] * w,
                                    f.d[1] * L + f.bend[1] * w + w * .3,
                                    f.d[2] * L + f.bend[2] * w);
          if (prev) push({ kind: 1, x: prev[0], y: prev[1], x2: x, y2: y,
                           z: (prev[2] + z) / 2, k: (prev[3] + k) / 2,
                           c: C_NET, a: S.nets * (1 - t * .55) * .55, w: 1.1 });
          prev = [x, y, z, k];
        }
      }
    }

    /* paint far -> near, fading distant points toward the background */
    const list = buf.slice(0, n).sort((a, b) => b.z - a.z);
    const span = Math.max(1, zMax - zMin);
    ctx.clearRect(0, 0, W, H);
    ctx.lineCap = 'round';
    for (const it of list) {
      const near = 1 - clamp((it.z - zMin) / span);
      const f = .3 + near * .7, c = it.c;
      const rr = Math.round(BG[0] + (c[0] - BG[0]) * f),
            gg = Math.round(BG[1] + (c[1] - BG[1]) * f),
            bb = Math.round(BG[2] + (c[2] - BG[2]) * f);
      const alpha = clamp(it.a * (.3 + near * .7));
      if (it.kind === 1) {
        ctx.strokeStyle = `rgba(${rr},${gg},${bb},${alpha.toFixed(3)})`;
        ctx.lineWidth = it.w * (.5 + near);
        ctx.beginPath(); ctx.moveTo(it.x, it.y); ctx.lineTo(it.x2, it.y2); ctx.stroke();
      } else {
        if (it.glow > .05) {
          ctx.shadowBlur = 8 + it.glow * 22;
          ctx.shadowColor = `rgba(${c[0]},${c[1]},${c[2]},${(.3 * it.glow).toFixed(2)})`;
        } else ctx.shadowBlur = 0;
        ctx.fillStyle = `rgba(${rr},${gg},${bb},${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(it.x, it.y, Math.max(.35, it.r * it.k * (.6 + near * .7) * SC), 0, TAU);
        ctx.fill();
      }
    }
    ctx.shadowBlur = 0;

    /* HUD, hero fade, one caption per band */
    const pc = Math.round(clamp(driver.p) * 100);
    if (pctEl) pctEl.textContent = pc + '%';
    if (trackEl) trackEl.style.height = pc + '%';
    if (hero) {
      hero.style.opacity = S.fade.toFixed(3);
      hero.style.transform = `translateY(${(-(1 - S.fade) * 34).toFixed(1)}px)`;
    }
    for (let i = 0; i < caps.length; i++) {
      const [a, b] = bands[i], u = (driver.p - a) / (b - a);
      const o = (u < 0 || u > 1) ? 0 : clamp(Math.min(u / .18, (1 - u) / .18));
      caps[i].style.opacity = o.toFixed(3);
      caps[i].style.transform = `translateY(${((1 - o) * 16).toFixed(1)}px)`;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
