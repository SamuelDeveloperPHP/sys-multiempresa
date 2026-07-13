import { useEffect, useMemo, useState } from 'react';

/**
 * Plano 2D do chassi (vista inferior) desenhado a partir do MESMO modelo OBJ do
 * visualizador 3D — projeta as faces (x=comprimento, z=largura) e pinta por
 * material, reproduzindo o desenho da imagem. Por cima, marcadores clicáveis por
 * posição do layout, coloridos pela profundidade de sulco (gestão dos pneus).
 */
const MAT = {
  chassis_dark: '#26262b', rubber_tire: '#141416', axle_metal: '#6b7280',
  cab_paint: '#e5e7eb', windshield: '#3b82f6', tank_silver: '#9ca3af',
  accent_magenta: '#d946ef', accent_green: '#10b981', default: '#4b5563',
};
// Ordem de pintura (estrutura embaixo, rodas/acentos em cima).
const ORDER = ['chassis_dark', 'axle_metal', 'tank_silver', 'windshield', 'cab_paint', 'accent_green', 'accent_magenta', 'rubber_tire', 'default'];
// Deslocamento lateral (z) de cada lane, p/ posicionar o marcador na roda certa.
const Z_LANE = { EE: -1.06, EI: -0.72, E: -0.95, D: 0.95, DI: 0.72, DE: 1.06 };

function corSulco(s, min, alerta) {
  if (s == null) return '#9ca3af';
  if (s < min) return '#ef4444';
  if (s < alerta) return '#f59e0b';
  return '#22c55e';
}

export default function Chassis2DPlan({ src = '/models/volvo_vm270_chassis.obj', posicoes = [], montados = {}, sulcoMin = 1.6, sulcoAlerta = 3, sel, onSelect }) {
  const [model, setModel] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let alive = true;
    fetch(src)
      .then((r) => { if (!r.ok) throw new Error('modelo'); return r.text(); })
      .then((text) => {
        const verts = []; const faces = []; let mat = 'default';
        for (let line of text.split('\n')) {
          line = line.trim();
          if (line.startsWith('v ')) { const p = line.split(/\s+/).slice(1).map(Number); if (p.length >= 3) verts.push(p); }
          else if (line.startsWith('usemtl ')) mat = line.split(/\s+/)[1] || 'default';
          else if (line.startsWith('f ')) { const idx = line.split(/\s+/).slice(1).map((t) => parseInt(t.split('/')[0], 10) - 1).filter((n) => !isNaN(n)); if (idx.length >= 3) faces.push({ v: idx, m: mat }); }
        }
        if (alive) setModel({ verts, faces });
      })
      .catch(() => { if (alive) setErr('Falha ao carregar o chassi.'); });
    return () => { alive = false; };
  }, [src]);

  const geo = useMemo(() => {
    if (!model) return null;
    const { verts, faces } = model;
    let mnX = Infinity, mxX = -Infinity, mnZ = Infinity, mxZ = -Infinity;
    for (const v of verts) { mnX = Math.min(mnX, v[0]); mxX = Math.max(mxX, v[0]); mnZ = Math.min(mnZ, v[2]); mxZ = Math.max(mxZ, v[2]); }
    const VW = 940, PAD = 26, sc = (VW - 2 * PAD) / (mxX - mnX), VH = Math.round((mxZ - mnZ) * sc + 2 * PAD);
    const PX = (x) => +(PAD + (x - mnX) * sc).toFixed(1);
    const PY = (z) => +(PAD + (mxZ - z) * sc).toFixed(1);

    const groups = {};
    for (const f of faces) (groups[f.m] ??= []).push(f);
    const polys = [];
    for (const m of ORDER) {
      const fs = groups[m]; if (!fs) continue;
      for (const f of fs) { const pts = f.v.map((i) => verts[i]).filter(Boolean).map(([x, , z]) => `${PX(x)},${PY(z)}`).join(' '); if (pts) polys.push({ m, pts }); }
    }

    // Posições X reais dos eixos (clusters da borracha), da frente p/ trás.
    const tv = new Set();
    for (const f of faces) if (f.m === 'rubber_tire') for (const i of f.v) tv.add(i);
    const tp = [...tv].map((i) => verts[i]).filter(Boolean).filter((v) => Math.abs(v[2]) > 0.5);
    const axs = [];
    for (const [x] of tp) { let a = axs.find((q) => Math.abs(q.x - x) < 0.9); if (!a) { a = { x, n: 0, s: 0 }; axs.push(a); } a.n++; a.s += x; a.x = a.s / a.n; }
    const axleX = axs.sort((a, b) => a.x - b.x).map((a) => a.x);

    return { VW, VH, PX, PY, axleX, mnX, mxZ };
  }, [model]);

  const markers = useMemo(() => {
    if (!geo) return [];
    const { PX, PY, axleX } = geo;
    const eixosLayout = [...new Set(posicoes.filter((p) => p.lane !== 'ESTEPE').map((p) => p.eixo))].sort((a, b) => a - b);
    const out = [];
    for (const p of posicoes) {
      if (p.lane === 'ESTEPE') {
        out.push({ codigo: p.codigo, cx: PX(geo.mnX) + 24, cy: geo.VH - 30, m: montados[p.codigo] });
        continue;
      }
      const idx = eixosLayout.indexOf(p.eixo);
      const x = axleX[Math.min(idx, axleX.length - 1)] ?? 0;
      out.push({ codigo: p.codigo, cx: PX(x), cy: PY(Z_LANE[p.lane] ?? 0), m: montados[p.codigo] });
    }
    return out;
  }, [geo, posicoes, montados]);

  if (err) return <div className="text-red-600 text-sm p-6 text-center">{err}</div>;
  if (!geo) return <div className="text-gray-400 text-sm p-6 text-center">Carregando chassi…</div>;

  const R = 15;
  return (
    <svg viewBox={`0 0 ${geo.VW} ${geo.VH}`} className="w-full h-auto">
      {geo.polys.map((p, i) => (
        <polygon key={i} points={p.pts} fill={MAT[p.m] || MAT.default} fillOpacity={0.95} stroke="rgba(15,23,42,0.16)" strokeWidth={0.4} />
      ))}
      {markers.map((mk) => {
        const st = mk.m ? corSulco(mk.m.sulco, sulcoMin, sulcoAlerta) : '#e5e7eb';
        const ativo = sel === mk.codigo;
        return (
          <g key={mk.codigo} style={{ cursor: 'pointer' }} onClick={() => onSelect(mk.codigo)}>
            {ativo && <circle cx={mk.cx} cy={mk.cy} r={R + 4} fill="none" stroke="#2563eb" strokeWidth={3} />}
            <circle cx={mk.cx} cy={mk.cy} r={R} fill={st} stroke="#0f172a" strokeWidth={1.6} />
            {!mk.m && <text x={mk.cx} y={mk.cy + 5} textAnchor="middle" fontSize={16} fill="#64748b" style={{ pointerEvents: 'none' }}>+</text>}
            <text x={mk.cx} y={mk.cy - R - 4} textAnchor="middle" fontSize={11} fontWeight="700" fill="#0f172a" style={{ pointerEvents: 'none' }}>{mk.codigo}</text>
          </g>
        );
      })}
    </svg>
  );
}
