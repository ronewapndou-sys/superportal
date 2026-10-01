import { useEffect, useRef } from 'react';

type Props = {
  /** Increase to send extra light along the traces (used for each keystroke). */
  pulse: number;
  /** Increase to dim the board briefly (used for a failed sign-in). */
  alarm: number;
};

type Dir = [number, number];
type Pt = { x: number; y: number };
type Trace = { pts: Pt[]; cum: number[]; total: number };
type Light = { trace: Trace; d: number; speed: number };
type Flash = { at: Pt; born: number };

const GRID = 16;
const DIE_PAD = 34;
/** The panel the brand block is designed for. Everything is drawn at this size, then scaled as one piece. */
const DESIGN_W = 714;
const DESIGN_H = 720;
const MIN_SCALE = 0.6;
const MAX_SCALE = 1.4;

const rngFrom = (seed: number) => () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const makeTrace = (pts: Pt[]): Trace => {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  return { pts, cum, total: cum[cum.length - 1] };
};

const posAt = (t: Trace, d: number): Pt => {
  let i = 1;
  while (i < t.cum.length - 1 && t.cum[i] < d) i++;
  const span = t.cum[i] - t.cum[i - 1] || 1;
  const k = Math.min(1, Math.max(0, (d - t.cum[i - 1]) / span));
  return { x: t.pts[i - 1].x + (t.pts[i].x - t.pts[i - 1].x) * k, y: t.pts[i - 1].y + (t.pts[i].y - t.pts[i - 1].y) * k };
};

const key = (d: Dir) => d.join(',');
const plus = (a: Dir, b: Dir): Dir => [a[0] + b[0], a[1] + b[1]];
const minus = (a: Dir, b: Dir): Dir => [a[0] - b[0], a[1] - b[1]];
const neg = (a: Dir): Dir => [-a[0], -a[1]];

/** Routes out from a start point: straight runs that turn by 45 degrees, always heading away from the hub. */
const route = (start: Pt, o: Dir, p: Dir, limit: number, rng: () => number): Trace => {
  const turns: Record<string, Dir[]> = {
    [key(o)]: [plus(o, p), minus(o, p)],
    [key(plus(o, p))]: [o, p],
    [key(minus(o, p))]: [o, neg(p)],
    [key(p)]: [plus(o, p)],
    [key(neg(p))]: [minus(o, p)],
  };
  const pts = [start];
  let hd = o;
  let cur = start;
  let used = 0;
  while (used < limit) {
    const cells = 2 + Math.floor(rng() * 6);
    cur = { x: cur.x + hd[0] * cells * GRID, y: cur.y + hd[1] * cells * GRID };
    pts.push(cur);
    used += cells;
    hd = turns[key(hd)][Math.floor(rng() * turns[key(hd)].length)];
  }
  return makeTrace(pts);
};

/** Ends a path where it first crosses a horizontal line (y grows downward). */
const cutAtY = (pts: Pt[], maxY: number): Pt[] => {
  const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    if (b.y <= maxY) { out.push(b); continue; }
    if (a.y < maxY) out.push({ x: a.x + ((b.x - a.x) * (maxY - a.y)) / (b.y - a.y), y: maxY });
    break;
  }
  return out.length > 1 ? out : [pts[0], pts[0]];
};

/**
 * The brand block is the hub of a circuit. The circuit is drawn once, in a fixed design space
 * centred on the logo, and scaled as one piece with the logo and tagline (the panel sets
 * --hero-scale), so their alignment is identical at every window size.
 * Slow pulses leave the hub; each keystroke sends one more; a failed sign-in dims the board.
 */
export function CircuitTraces({ pulse, alarm }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const events = useRef({ kicks: 0, alarmAt: -1e9 });
  const seen = useRef({ pulse, alarm });

  useEffect(() => {
    if (pulse !== seen.current.pulse) events.current.kicks += 1;
    if (alarm !== seen.current.alarm) events.current.alarmAt = performance.now();
    seen.current = { pulse, alarm };
  }, [pulse, alarm]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const host = canvas.parentElement!;
    const core = host.querySelector('.login-hero-inner');
    const ctx = canvas.getContext('2d')!;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const board = document.createElement('canvas');
    const bctx = board.getContext('2d')!;

    let w = 0, h = 0, raf = 0, nextLight = 0;
    let scale = 1;
    let hub = { x: 0, y: 0 }; // the logo block's centre, in panel pixels
    let traces: Trace[] = [];
    const lights: Light[] = [];
    const flashes: Flash[] = [];

    // Everything below is in design units, with the hub at (0, 0).
    const build = (blockW: number, blockH: number) => {
      const rng = rngFrom(11);
      const x0 = -blockW / 2 - DIE_PAD, x1 = blockW / 2 + DIE_PAD;
      const y0 = -blockH / 2 - DIE_PAD, y1 = blockH / 2 + DIE_PAD;
      const snap = (v: number) => Math.round(v / GRID) * GRID;
      const out: Trace[] = [];
      // Traces on the lower edge stop above the MIE and XDS logos. They are cut after routing, so the
      // random shapes (and every other trace) stay the same whatever the window size.
      const partners = host.querySelector('.login-partners')?.getBoundingClientRect();
      const maxY = partners ? (partners.top - host.getBoundingClientRect().top - hub.y) / scale - 30 : Infinity;
      const edge = (n: number, at: (t: number) => Pt, o: Dir, p: Dir, len: [number, number], limitY = Infinity) => {
        for (let i = 0; i < n; i++) {
          const t = 0.14 + ((i + 0.5) / n) * 0.72 + (rng() - 0.5) * 0.08;
          const s = at(t);
          const full = route({ x: snap(s.x), y: snap(s.y) }, o, p, len[0] + Math.floor(rng() * (len[1] - len[0])), rng);
          out.push(limitY === Infinity ? full : makeTrace(cutAtY(full.pts, limitY)));
        }
      };
      const dw = x1 - x0, dh = y1 - y0;
      edge(3, (t) => ({ x: x0 + dw * t, y: y0 }), [0, -1], [1, 0], [10, 26]);
      edge(3, (t) => ({ x: x0 + dw * t, y: y1 }), [0, 1], [1, 0], [10, 26], maxY);
      edge(2, (t) => ({ x: x0, y: y0 + dh * t }), [-1, 0], [0, 1], [5, 14]);
      edge(2, (t) => ({ x: x1, y: y0 + dh * t }), [1, 0], [0, 1], [5, 14]);
      traces = out;
    };

    const toPanel = (c: CanvasRenderingContext2D, dpr: number) => c.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * hub.x, dpr * hub.y);

    // Draws each trace up to a fraction of its length (1 = complete, with its end node).
    const paintTraces = (c: CanvasRenderingContext2D, progress: (i: number) => number) => {
      c.lineJoin = 'round';
      c.lineCap = 'round';
      traces.forEach((t, i) => {
        const p = progress(i);
        if (p <= 0) return;
        const bright = i % 3 === 0;
        const reach = p * t.total;
        c.beginPath();
        c.moveTo(t.pts[0].x, t.pts[0].y);
        for (let j = 1; j < t.pts.length && t.cum[j - 1] < reach; j++) {
          const end = reach >= t.cum[j] ? t.pts[j] : posAt(t, reach);
          c.lineTo(end.x, end.y);
        }
        c.strokeStyle = bright ? 'rgba(60, 141, 255, 0.6)' : 'rgba(46, 130, 240, 0.32)';
        c.lineWidth = bright ? 1.6 : 1.2;
        c.shadowColor = '#1f6bff';
        c.shadowBlur = bright ? 5 : 0;
        c.stroke();
        c.shadowBlur = 0;

        // A pad where the trace starts, and a node where it ends.
        const a = t.pts[0];
        c.beginPath();
        c.arc(a.x, a.y, 2.4, 0, Math.PI * 2);
        c.fillStyle = 'rgba(120, 190, 255, 0.8)';
        c.fill();
        if (p >= 1) {
          const e = t.pts[t.pts.length - 1];
          c.beginPath();
          c.arc(e.x, e.y, 2.6, 0, Math.PI * 2);
          c.fillStyle = 'rgba(90, 170, 255, 0.6)';
          c.fill();
        }
      });
    };

    const paintBoard = () => {
      const dpr = board.width / w;
      bctx.setTransform(1, 0, 0, 1, 0, 0);
      bctx.clearRect(0, 0, board.width, board.height);
      toPanel(bctx, dpr);
      paintTraces(bctx, () => 1);
    };

    // On load the traces draw themselves out from the logo, one after another.
    const born = performance.now();
    const INTRO_START = 0.7, INTRO_STAGGER = 0.11, INTRO_DRAW = 1.4;
    const introEnd = () => INTRO_START + traces.length * INTRO_STAGGER + INTRO_DRAW + 0.1;
    const introProgress = (now: number) => (i: number) => {
      const p = ((now - born) / 1000 - INTRO_START - i * INTRO_STAGGER) / INTRO_DRAW;
      return p <= 0 ? 0 : p >= 1 ? 1 : 1 - Math.pow(1 - p, 3);
    };

    const size = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = board.width = Math.round(w * dpr);
      canvas.height = board.height = Math.round(h * dpr);

      // One scale for the whole panel; the logo and tagline pick it up from the CSS variable.
      scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.min(w / DESIGN_W, h / DESIGN_H)));
      host.style.setProperty('--hero-scale', scale.toFixed(4));

      const box = core?.getBoundingClientRect();
      const hero = host.getBoundingClientRect();
      if (box) {
        hub = { x: (box.left + box.right) / 2 - hero.left, y: (box.top + box.bottom) / 2 - hero.top };
        build(box.width / scale, box.height / scale);
      } else {
        hub = { x: w / 2, y: h / 2 };
        build(520, 160);
      }
      paintBoard();
      lights.length = 0;
    };

    const launch = (speed: number) => {
      const trace = traces[Math.floor(Math.random() * traces.length)];
      if (trace) lights.push({ trace, d: 0, speed });
    };

    const draw = (now: number, dt: number) => {
      const dpr = canvas.width / w;
      const dim = 1 - 0.75 * Math.exp(-(now - events.current.alarmAt) / 1500);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = dim;
      const intro = !reduce && (now - born) / 1000 < introEnd();
      if (!intro) ctx.drawImage(board, 0, 0);
      toPanel(ctx, dpr);
      if (intro) paintTraces(ctx, introProgress(now));

      for (let i = lights.length - 1; i >= 0; i--) {
        const l = lights[i];
        l.d += l.speed * dt;
        if (l.d >= l.trace.total) {
          flashes.push({ at: l.trace.pts[l.trace.pts.length - 1], born: now });
          lights.splice(i, 1);
          continue;
        }
        for (let k = 0; k < 9; k++) {
          const p = posAt(l.trace, Math.max(0, l.d - k * 6));
          ctx.beginPath();
          ctx.arc(p.x, p.y, k === 0 ? 2.6 : 2 - k * 0.15, 0, Math.PI * 2);
          ctx.globalAlpha = dim * (1 - k / 9);
          ctx.fillStyle = '#9fd6ff';
          ctx.shadowColor = '#9fd6ff';
          ctx.shadowBlur = k === 0 ? 8 : 0;
          ctx.fill();
        }
        ctx.shadowBlur = 0;
      }
      for (let i = flashes.length - 1; i >= 0; i--) {
        const f = flashes[i];
        const age = (now - f.born) / 900;
        if (age >= 1) { flashes.splice(i, 1); continue; }
        ctx.beginPath();
        ctx.arc(f.at.x, f.at.y, 3 + age * 12, 0, Math.PI * 2);
        ctx.strokeStyle = '#7cc4ff';
        ctx.lineWidth = 1.2;
        ctx.globalAlpha = dim * (1 - age) * 0.8;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    };

    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      while (events.current.kicks > 0) {
        events.current.kicks -= 1;
        launch(120);
      }
      if (now > nextLight && (now - born) / 1000 > introEnd()) {
        launch(40 + Math.random() * 20);
        nextLight = now + 6000 + Math.random() * 4000;
      }
      draw(now, dt);
      raf = requestAnimationFrame(frame);
    };

    size();
    const ro = new ResizeObserver(() => { size(); if (reduce) draw(performance.now(), 0); });
    ro.observe(canvas);
    if (core) ro.observe(core);
    if (reduce) draw(performance.now(), 0);
    else raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} className="login-circuit" aria-hidden="true" />;
}
