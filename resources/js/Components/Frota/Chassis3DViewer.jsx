import { useEffect, useRef, useState } from 'react';

/**
 * Visualizador 3D do chassi (Canvas 2D puro — sem three.js). Carrega um OBJ,
 * normaliza, e desenha com rotação yaw/pitch + projeção em perspectiva +
 * painter's algorithm. Arraste para girar; presets e auto-rotação.
 * É VISUALIZAÇÃO rica — a gestão de pneus (montar/trocar/status) fica no mapa 2D.
 */
const MAT = {
  chassis_dark: '#26262b', rubber_tire: '#141416', axle_metal: '#6b7280',
  cab_paint: '#e5e7eb', windshield: '#3b82f6', tank_silver: '#9ca3af',
  accent_magenta: '#d946ef', accent_green: '#10b981', default: '#4b5563',
};

export default function Chassis3DViewer({ src = '/models/volvo_vm270_chassis.obj' }) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [auto, setAuto] = useState(true);

  const rot = useRef({ x: -0.35, y: 0.6 });
  const autoRef = useRef(true);
  const modelRef = useRef(null);
  const drag = useRef(null);

  useEffect(() => { autoRef.current = auto; }, [auto]);

  // Carrega + normaliza o OBJ
  useEffect(() => {
    let alive = true;
    setLoading(true); setError(null);
    fetch(src)
      .then((r) => { if (!r.ok) throw new Error('Não foi possível carregar o modelo 3D.'); return r.text(); })
      .then((text) => {
        const verts = []; const faces = []; let mat = 'default';
        for (let line of text.split('\n')) {
          line = line.trim();
          if (line.startsWith('v ')) { const p = line.split(/\s+/).slice(1).map(Number); if (p.length >= 3) verts.push(p); }
          else if (line.startsWith('usemtl ')) mat = line.split(/\s+/)[1] || 'default';
          else if (line.startsWith('f ')) {
            const idx = line.split(/\s+/).slice(1).map((t) => parseInt(t.split('/')[0], 10) - 1).filter((n) => !isNaN(n));
            if (idx.length >= 3) faces.push({ verts: idx, mat });
          }
        }
        if (!verts.length) throw new Error('O modelo 3D está vazio ou corrompido.');
        let a = Infinity, b = -Infinity, c = Infinity, d = -Infinity, e = Infinity, f = -Infinity;
        for (const v of verts) { a = Math.min(a, v[0]); b = Math.max(b, v[0]); c = Math.min(c, v[1]); d = Math.max(d, v[1]); e = Math.min(e, v[2]); f = Math.max(f, v[2]); }
        const cx = (a + b) / 2, cy = (c + d) / 2, cz = (e + f) / 2, size = Math.max(b - a, d - c, f - e) || 1;
        const nv = verts.map((v) => [(v[0] - cx) / size, (v[1] - cy) / size, (v[2] - cz) / size]);
        if (alive) { modelRef.current = { vertices: nv, faces }; setLoading(false); }
      })
      .catch((err) => { if (alive) { setError(err.message || 'Erro ao carregar o modelo 3D.'); setLoading(false); } });
    return () => { alive = false; };
  }, [src]);

  // Loop de render (lê refs — não re-renderiza o React por frame)
  useEffect(() => {
    let raf;
    const draw = () => {
      const canvas = canvasRef.current; const model = modelRef.current;
      if (canvas && model) {
        const ctx = canvas.getContext('2d'); const W = canvas.width; const H = canvas.height;
        if (autoRef.current && !drag.current) rot.current.y = (rot.current.y + 0.005) % (2 * Math.PI);
        ctx.clearRect(0, 0, W, H);
        const CX = W / 2, CY = H / 2, scale = Math.min(W, H) * 1.5, cam = 2.2;
        const cosY = Math.cos(rot.current.y), sinY = Math.sin(rot.current.y), cosX = Math.cos(rot.current.x), sinX = Math.sin(rot.current.x);
        const proj = model.vertices.map((v) => {
          const x = v[0], y = v[1], z = v[2];
          const x1 = x * cosY - z * sinY, z1 = x * sinY + z * cosY;
          const y2 = y * cosX - z1 * sinX, z2 = y * sinX + z1 * cosX;
          const p = 1 / (cam - z2);
          return { x: CX + x1 * scale * p, y: CY - y2 * scale * p, z: z2 };
        });
        const sorted = model.faces.map((fc) => { let s = 0; for (const i of fc.verts) s += proj[i]?.z || 0; return { fc, z: s / fc.verts.length }; }).sort((m, n) => m.z - n.z);
        for (const { fc } of sorted) {
          ctx.fillStyle = MAT[fc.mat] || MAT.default;
          ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 0.5;
          ctx.beginPath();
          fc.verts.forEach((vi, i) => { const pt = proj[vi]; if (pt) { if (i === 0) ctx.moveTo(pt.x, pt.y); else ctx.lineTo(pt.x, pt.y); } });
          ctx.closePath(); ctx.fill(); ctx.stroke();
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);

  // Redimensiona o canvas ao tamanho do container
  useEffect(() => {
    const onResize = () => { const c = canvasRef.current, w = wrapRef.current; if (c && w) { c.width = w.clientWidth; c.height = w.clientHeight; } };
    window.addEventListener('resize', onResize); onResize();
    const t = setTimeout(onResize, 80);
    return () => { window.removeEventListener('resize', onResize); clearTimeout(t); };
  }, [loading]);

  const start = (x, y) => { drag.current = { x, y }; };
  const move = (x, y) => {
    if (!drag.current) return;
    rot.current.y = (rot.current.y + (x - drag.current.x) * 0.007) % (2 * Math.PI);
    rot.current.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, rot.current.x - (y - drag.current.y) * 0.007));
    drag.current = { x, y };
  };
  const end = () => { drag.current = null; };
  const preset = (v) => {
    setAuto(false); autoRef.current = false;
    const P = { perspectiva: [-0.35, 0.6], lateral: [0, Math.PI / 2], superior: [-Math.PI / 2, 0.0001], frontal: [0, 0] };
    rot.current = { x: P[v][0], y: P[v][1] };
  };

  const btn = 'px-3 py-1.5 text-xs font-medium rounded-md bg-white/5 border border-white/10 text-gray-200 hover:bg-white/10 hover:border-blue-500 transition';

  return (
    <div className="rounded-xl overflow-hidden border border-white/10" style={{ background: 'radial-gradient(circle at 50% 40%, #17171c 0%, #0e0e11 100%)' }}>
      <div ref={wrapRef} className="relative w-full" style={{ height: 340 }}>
        {loading && <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">Carregando modelo 3D…</div>}
        {error && <div className="absolute inset-0 flex items-center justify-center text-red-300 text-sm px-4 text-center">⚠️ {error}</div>}
        {!loading && !error && (
          <canvas
            ref={canvasRef}
            className="w-full h-full cursor-grab active:cursor-grabbing touch-none"
            onMouseDown={(e) => start(e.clientX, e.clientY)}
            onMouseMove={(e) => move(e.clientX, e.clientY)}
            onMouseUp={end}
            onMouseLeave={end}
            onTouchStart={(e) => e.touches[0] && start(e.touches[0].clientX, e.touches[0].clientY)}
            onTouchMove={(e) => e.touches[0] && move(e.touches[0].clientX, e.touches[0].clientY)}
            onTouchEnd={end}
          />
        )}
        {!loading && !error && (
          <span className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 text-gray-300 text-[11px] uppercase tracking-wide px-3 py-1 rounded-full border border-white/10 pointer-events-none">Arraste para girar</span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 p-3 bg-black/30 border-t border-white/10">
        <button type="button" onClick={() => preset('perspectiva')} className={btn}>Perspectiva</button>
        <button type="button" onClick={() => preset('lateral')} className={btn}>Lateral</button>
        <button type="button" onClick={() => preset('superior')} className={btn}>Superior</button>
        <button type="button" onClick={() => preset('frontal')} className={btn}>Frontal</button>
        <label className="ml-auto flex items-center gap-2 text-xs text-gray-300 cursor-pointer select-none">
          <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} className="accent-blue-500" />
          Girar automaticamente
        </label>
      </div>
    </div>
  );
}
