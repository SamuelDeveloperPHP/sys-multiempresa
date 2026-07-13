import { useEffect, useMemo, useState } from 'react';

/**
 * Plano 2D do chassi (vista inferior): usa o MESMO OBJ do 3D como FUNDO (chassi,
 * cabine, tanque, eixos — tudo menos os pneus) e desenha as RODAS por conta
 * própria, exatamente nas posições do layout. Assim vale para qualquer layout
 * (toco/truck/6x2/rolo…) sem descasamento com o nº de eixos do modelo.
 * Cada roda é clicável e colorida pela profundidade de sulco.
 */
const MAT = {
  chassis_dark: '#26262b', axle_metal: '#6b7280', cab_paint: '#e5e7eb',
  windshield: '#3b82f6', tank_silver: '#9ca3af', accent_magenta: '#d946ef',
  accent_green: '#10b981', default: '#4b5563',
};
// Fundo: tudo menos a borracha (as rodas são desenhadas por cima).
const ORDER_BG = ['chassis_dark', 'axle_metal', 'tank_silver', 'windshield', 'cab_paint', 'accent_green', 'accent_magenta', 'default'];
// Posição lateral (z) de cada lane.
const Z_LANE = { EE: -1.12, EI: -0.56, E: -0.88, D: 0.88, DI: 0.56, DE: 1.12 };

function corSulco(s, min, alerta) {
  if (s == null) return '#cbd5e1';
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
    for (const m of ORDER_BG) {
      const fs = groups[m]; if (!fs) continue;
      for (const f of fs) { const pts = f.v.map((i) => verts[i]).filter(Boolean).map(([x, , z]) => `${PX(x)},${PY(z)}`).join(' '); if (pts) polys.push({ m, pts }); }
    }

    // Eixos reais do modelo (x dos clusters da borracha; ignora estepe).
    const tv = new Set();
    for (const f of faces) if (f.m === 'rubber_tire') for (const i of f.v) tv.add(i);
    const tp = [...tv].map((i) => verts[i]).filter(Boolean).filter((v) => Math.abs(v[2]) > 0.8);
    const axs = [];
    for (const [x] of tp) { let a = axs.find((q) => Math.abs(q.x - x) < 0.9); if (!a) { a = { x, n: 0, s: 0 }; axs.push(a); } a.n++; a.s += x; a.x = a.s / a.n; }
    const modelAxles = axs.filter((a) => a.n >= 6).sort((a, b) => a.x - b.x).map((a) => a.x);

    return { VW, VH, PX, PY, sc, polys, modelAxles, mnX, mxZ };
  }, [model]);

  const { wheels, beams } = useMemo(() => {
    if (!geo) return { wheels: [], beams: [] };
    const { PX, PY, modelAxles } = geo;
    const eixos = [...new Set(posicoes.filter((p) => p.lane !== 'ESTEPE').map((p) => p.eixo))].sort((a, b) => a - b);
    const N = eixos.length, M = modelAxles.length || 1;
    const eixoX = {};
    eixos.forEach((eixo, i) => { let mi = i === 0 ? 0 : (M - (N - 1) + (i - 1)); mi = Math.max(0, Math.min(M - 1, mi)); eixoX[eixo] = modelAxles[mi] ?? 0; });
    const wheels = [];
    for (const p of posicoes) {
      if (p.lane === 'ESTEPE') { wheels.push({ codigo: p.codigo, cx: PX(geo.mnX) + 34, cy: geo.VH - 36, m: montados[p.codigo], estepe: true }); continue; }
      wheels.push({ codigo: p.codigo, cx: PX(eixoX[p.eixo] ?? 0), cy: PY(Z_LANE[p.lane] ?? 0), m: montados[p.codigo] });
    }
    const beams = [...new Set(eixos.map((e) => eixoX[e]))].map((x) => PX(x));
    return { wheels, beams };
  }, [geo, posicoes, montados]);

  if (err) return <div className="text-red-600 text-sm p-6 text-center">{err}</div>;
  if (!geo) return <div className="text-gray-400 text-sm p-6 text-center">Carregando chassi…</div>;

  const TW = geo.sc * 1.2, TH = geo.sc * 0.5;   // roda: comprida no X, largura no Z
  const EW = geo.sc * 0.6;                        // estepe (quadrado)
  return (
    <svg viewBox={`0 0 ${geo.VW} ${geo.VH}`} className="w-full h-auto">
      {geo.polys.map((p, i) => (
        <polygon key={i} points={p.pts} fill={MAT[p.m] || MAT.default} fillOpacity={0.95} stroke="rgba(15,23,42,0.16)" strokeWidth={0.4} />
      ))}
      {/* barras de eixo (liga as rodas de cada eixo) */}
      {beams.map((x, i) => (
        <line key={`ax${i}`} x1={x} y1={geo.PY(1.2)} x2={x} y2={geo.PY(-1.2)} stroke="#334155" strokeWidth={6} strokeLinecap="round" />
      ))}
      {/* rodas (desenhadas nas posições do layout) */}
      {wheels.map((w) => {
        const st = w.m ? corSulco(w.m.sulco, sulcoMin, sulcoAlerta) : '#cbd5e1';
        const ativo = sel === w.codigo;
        const wd = w.estepe ? EW : TW, ht = w.estepe ? EW : TH;
        return (
          <g key={w.codigo} style={{ cursor: 'pointer' }} onClick={() => onSelect(w.codigo)}>
            <rect x={w.cx - wd / 2} y={w.cy - ht / 2} width={wd} height={ht} rx={9}
              fill={w.m ? '#141416' : '#f1f5f9'} stroke={ativo ? '#2563eb' : st} strokeWidth={ativo ? 5 : 4}
              strokeDasharray={w.m ? '0' : '6 4'} />
            {!w.m && <text x={w.cx} y={w.cy + 6} textAnchor="middle" fontSize={18} fill="#94a3b8" style={{ pointerEvents: 'none' }}>+</text>}
            <text x={w.cx} y={w.cy - ht / 2 - 6} textAnchor="middle" fontSize={12} fontWeight="700" fill="#0f172a" style={{ pointerEvents: 'none' }}>{w.codigo}</text>
          </g>
        );
      })}
    </svg>
  );
}
