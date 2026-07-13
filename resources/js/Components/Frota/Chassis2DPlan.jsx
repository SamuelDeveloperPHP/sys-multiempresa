import { useEffect, useMemo, useState } from 'react';

/**
 * Plano 2D do chassi (vista inferior): OBJ do 3D como FUNDO (chassi/cabine/
 * tanque/eixos, sem a borracha) + rodas desenhadas nas posições do layout.
 * Cada roda leva P{n} dentro; a etiqueta "P{n} · marca · sulco" fica numa faixa
 * (rodas de cima → faixa superior; de baixo → inferior), distribuída sem
 * sobreposição e ligada à roda por uma linha de chamada (callout).
 */
const MAT = {
  chassis_dark: '#26262b', axle_metal: '#6b7280', cab_paint: '#e5e7eb',
  windshield: '#3b82f6', tank_silver: '#9ca3af', accent_magenta: '#d946ef',
  accent_green: '#10b981', default: '#4b5563',
};
const ORDER_BG = ['chassis_dark', 'axle_metal', 'tank_silver', 'windshield', 'cab_paint', 'accent_green', 'accent_magenta', 'default'];
const Z_LANE = { EE: -1.2, EI: -0.5, E: -0.82, D: 0.82, DI: 0.5, DE: 1.2 };

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
    const VW = 1040, PADX = 40, BAND = 150;               // faixas p/ etiquetas (topo/base)
    const sc = (VW - 2 * PADX) / (mxX - mnX);
    const VH = Math.round(BAND * 2 + (mxZ - mnZ) * sc);
    const PX = (x) => +(PADX + (x - mnX) * sc).toFixed(1);
    const PY = (z) => +(BAND + (mxZ - z) * sc).toFixed(1);

    const groups = {};
    for (const f of faces) (groups[f.m] ??= []).push(f);
    const polys = [];
    for (const m of ORDER_BG) {
      const fs = groups[m]; if (!fs) continue;
      for (const f of fs) { const pts = f.v.map((i) => verts[i]).filter(Boolean).map(([x, , z]) => `${PX(x)},${PY(z)}`).join(' '); if (pts) polys.push({ m, pts }); }
    }

    const tv = new Set();
    for (const f of faces) if (f.m === 'rubber_tire') for (const i of f.v) tv.add(i);
    const tp = [...tv].map((i) => verts[i]).filter(Boolean).filter((v) => Math.abs(v[2]) > 0.8);
    const axs = [];
    for (const [x] of tp) { let a = axs.find((q) => Math.abs(q.x - x) < 0.9); if (!a) { a = { x, n: 0, s: 0 }; axs.push(a); } a.n++; a.s += x; a.x = a.s / a.n; }
    const modelAxles = axs.filter((a) => a.n >= 6).sort((a, b) => a.x - b.x).map((a) => a.x);

    return { VW, VH, BAND, PADX, PX, PY, sc, polys, modelAxles, mnX, mxZ };
  }, [model]);

  const { wheels, beams, labels } = useMemo(() => {
    if (!geo) return { wheels: [], beams: [], labels: [] };
    const { PX, PY, modelAxles, VW, VH, PADX } = geo;
    const eixos = [...new Set(posicoes.filter((p) => p.lane !== 'ESTEPE').map((p) => p.eixo))].sort((a, b) => a - b);
    const N = eixos.length, M = modelAxles.length || 1;
    const eixoX = {};
    eixos.forEach((e, i) => { let mi = i === 0 ? 0 : (M - (N - 1) + (i - 1)); mi = Math.max(0, Math.min(M - 1, mi)); eixoX[e] = modelAxles[mi] ?? 0; });

    let n = 0; const wheels = [];
    for (const p of posicoes) {
      const m = montados[p.codigo];
      if (p.lane === 'ESTEPE') { wheels.push({ codigo: p.codigo, pn: 'EST', cx: PX(geo.mnX) + 40, cy: VH - geo.BAND - 24, side: 'bottom', m, estepe: true }); continue; }
      n++;
      const z = Z_LANE[p.lane] ?? 0;
      wheels.push({ codigo: p.codigo, pn: 'P' + n, cx: PX(eixoX[p.eixo] ?? 0), cy: PY(z), side: z > 0 ? 'top' : 'bottom', m });
    }
    const beams = [...new Set(eixos.map((e) => eixoX[e]))].map((x) => PX(x));

    const labels = [];
    for (const side of ['top', 'bottom']) {
      const ws = wheels.filter((w) => w.side === side && !w.estepe).sort((a, b) => a.cx - b.cx);
      const k = ws.length; if (!k) continue;
      const x0 = PADX + 60, x1 = VW - PADX - 60;
      ws.forEach((w, i) => {
        const lx = k === 1 ? (x0 + x1) / 2 : x0 + (i / (k - 1)) * (x1 - x0);
        const ly = side === 'top' ? 34 : VH - 20;
        labels.push({ codigo: w.codigo, pn: w.pn, m: w.m, lx, ly, wcx: w.cx, wcy: w.cy, side });
      });
    }
    return { wheels, beams, labels };
  }, [geo, posicoes, montados]);

  if (err) return <div className="text-red-600 text-sm p-6 text-center">{err}</div>;
  if (!geo) return <div className="text-gray-400 text-sm p-6 text-center">Carregando chassi…</div>;

  const TW = geo.sc * 1.25, TH = geo.sc * 0.58, EW = geo.sc * 0.66;
  const etiqueta = (l) => l.m ? `${l.pn} · ${l.m.marca || '—'} · ${l.m.sulco != null ? l.m.sulco + 'mm' : '—'}` : `${l.pn} · vazio`;

  return (
    <svg viewBox={`0 0 ${geo.VW} ${geo.VH}`} className="w-full h-auto">
      {geo.polys.map((p, i) => (
        <polygon key={i} points={p.pts} fill={MAT[p.m] || MAT.default} fillOpacity={0.95} stroke="rgba(15,23,42,0.16)" strokeWidth={0.4} />
      ))}
      {beams.map((x, i) => (
        <line key={`ax${i}`} x1={x} y1={geo.PY(1.25)} x2={x} y2={geo.PY(-1.25)} stroke="#334155" strokeWidth={6} strokeLinecap="round" />
      ))}

      {/* linhas de chamada */}
      {labels.map((l) => (
        <line key={`ld${l.codigo}`} x1={l.lx} y1={l.side === 'top' ? l.ly + 8 : l.ly - 16} x2={l.wcx} y2={l.side === 'top' ? l.wcy - TH / 2 : l.wcy + TH / 2}
          stroke="#94a3b8" strokeWidth={1} />
      ))}

      {/* rodas (P{n} dentro) */}
      {wheels.map((w) => {
        const st = w.m ? corSulco(w.m.sulco, sulcoMin, sulcoAlerta) : '#cbd5e1';
        const ativo = sel === w.codigo;
        const wd = w.estepe ? EW : TW, ht = w.estepe ? EW : TH;
        return (
          <g key={w.codigo} style={{ cursor: 'pointer' }} onClick={() => onSelect(w.codigo)}>
            <title>{w.m ? `${w.m.numero_fogo} · ${[w.m.marca, w.m.medida].filter(Boolean).join(' ')} · sulco ${w.m.sulco ?? '—'} mm` : `${w.estepe ? 'Estepe' : w.pn} — vazia`}</title>
            <rect x={w.cx - wd / 2} y={w.cy - ht / 2} width={wd} height={ht} rx={9}
              fill={w.m ? '#141416' : '#f1f5f9'} stroke={ativo ? '#2563eb' : st} strokeWidth={ativo ? 5 : 4}
              strokeDasharray={w.m ? '0' : '6 4'} />
            <text x={w.cx} y={w.cy + 5} textAnchor="middle" fontSize={13} fontWeight="700" fill={w.m ? '#ffffff' : '#334155'} style={{ pointerEvents: 'none' }}>{w.estepe ? 'EST' : w.pn}</text>
          </g>
        );
      })}

      {/* etiquetas (faixa) */}
      {labels.map((l) => {
        const st = l.m ? corSulco(l.m.sulco, sulcoMin, sulcoAlerta) : '#cbd5e1';
        return (
          <g key={`lb${l.codigo}`} style={{ cursor: 'pointer' }} onClick={() => onSelect(l.codigo)}>
            <circle cx={l.lx - 62} cy={l.ly - 4} r={4} fill={st} />
            <text x={l.lx - 52} y={l.ly} textAnchor="start" fontSize={12} fill="#0f172a" style={{ pointerEvents: 'none' }}>
              <tspan fontWeight="700">{l.pn}</tspan>{(l.m ? ` · ${l.m.marca || '—'} · ${l.m.sulco != null ? l.m.sulco + 'mm' : '—'}` : ' · vazio')}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
