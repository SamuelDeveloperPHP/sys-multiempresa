import { useMemo } from 'react';

/**
 * Charts SVG puros — sem dependência externa.
 * Tipografia: Arial 11px (padronizada). Cores: paleta consistente
 * com a Show.jsx do veículo. Altura fixa 320px para alinhamento.
 */

/* ============================================================
 * BarChart
 *   - Escala Y "nice" granular (1, 1.5, 2, 3, 4, 5, 6, 8, 10).
 *   - Gradiente vertical e topo arredondado.
 *   - Suporta múltiplos datasets (barras agrupadas, lado a lado).
 *
 *   props:
 *     title        — string
 *     labels       — string[]
 *     values       — number[]                            (1 dataset)
 *     datasets     — [{ label, values, color, gradient }] (>=1)
 *     color        — fallback de cor única
 *     colorGradient— [c1, c2]
 *     formatter    — fn(v) usada nos datalabels e tooltips
 *     yFormatter   — fn(v) usada nos ticks do eixo Y
 *     rotated      — bool, rotaciona labels do eixo X
 *     legend       — bool, exibe legenda dos datasets
 * ============================================================ */
export function BarChart({
  title, labels, values, datasets,
  color = '#6366f1', colorGradient,
  formatter, yFormatter, rotated = false, legend = false,
}) {
  const series = datasets ?? [{ label: '', values: values ?? [], color, gradient: colorGradient }];
  const hasData = series.some((s) => (s.values ?? []).some((v) => Number(v) !== 0));

  const W = 760, H = 320;
  const padL = 70, padR = 20, padT = 36, padB = rotated ? 78 : (legend ? 64 : 48);
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const niceMax = (v) => {
    if (v <= 0) return 1;
    const exp = Math.pow(10, Math.floor(Math.log10(v)));
    const f = v / exp;
    const nf = f <= 1 ? 1 : f <= 1.5 ? 1.5 : f <= 2 ? 2 : f <= 3 ? 3
            : f <= 4 ? 4 : f <= 5 ? 5 : f <= 6 ? 6 : f <= 8 ? 8 : 10;
    return nf * exp;
  };

  const allValues = series.flatMap((s) => (s.values ?? []).map(Number));
  const maxV = Math.max(0.0001, ...allValues);
  const yMax = niceMax(maxV * 1.1);

  const groupCount = labels.length;
  const step = groupCount > 0 ? innerW / groupCount : 0;
  const seriesCount = series.length;
  const groupW = step * 0.7;
  const barW  = groupW / seriesCount;

  const yTicks = 4;
  const valFmt = formatter  ?? ((v) => Number(v).toLocaleString('pt-BR'));
  const yFmt   = yFormatter ?? valFmt;

  const id = useMemo(() => Math.random().toString(36).slice(2, 8), []);

  return (
    <>
      <h4 className="text-gray-700 mb-2"
          style={{ fontFamily: 'Arial, sans-serif', fontSize: 13, fontWeight: 700 }}>
        {title}
      </h4>

      {!hasData ? (
        <div className="flex-1 flex items-center justify-center text-gray-400 border border-dashed rounded"
             style={{ fontFamily: 'Arial, sans-serif', fontSize: 12, minHeight: 280 }}>
          Sem dados para exibir.
        </div>
      ) : (
        <div className="flex-1 w-full" style={{ height: 320 }}>
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
            <defs>
              {series.map((s, si) => {
                const [c1, c2] = s.gradient ?? [s.color ?? color, s.color ?? color];
                return (
                  <linearGradient key={si} id={`bar-${id}-${si}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"  stopColor={c1} />
                    <stop offset="100%" stopColor={c2} />
                  </linearGradient>
                );
              })}
            </defs>

            {/* grid + ticks Y */}
            {Array.from({ length: yTicks + 1 }, (_, i) => {
              const v = (yMax * (yTicks - i)) / yTicks;
              const y = padT + (innerH * i) / yTicks;
              return (
                <g key={i}>
                  <line x1={padL} x2={W - padR} y1={y} y2={y} stroke="#eef0f4" strokeDasharray="4 4" />
                  <text x={padL - 10} y={y + 4} textAnchor="end" fill="#9aa0ad"
                        fontFamily="Arial, sans-serif" fontSize="11">
                    {yFmt(v)}
                  </text>
                </g>
              );
            })}

            {/* barras agrupadas */}
            {labels.map((label, i) => {
              const groupX = padL + step * i + (step - groupW) / 2;
              return (
                <g key={i}>
                  {series.map((s, si) => {
                    const v = Number(s.values?.[i] ?? 0);
                    const x = groupX + barW * si;
                    const h = (v / yMax) * innerH;
                    const y = padT + innerH - h;
                    return (
                      <g key={si}>
                        <title>{`${label}${s.label ? ' — ' + s.label : ''}: ${valFmt(v)}`}</title>
                        {v > 0 && (
                          <rect x={x + barW * 0.05} y={y} width={barW * 0.9} height={h}
                                fill={`url(#bar-${id}-${si})`} rx="3" ry="3" />
                        )}
                        {v > 0 && seriesCount === 1 && (
                          <text x={x + barW / 2} y={y - 8} textAnchor="middle"
                                fill="#3f4654" fontFamily="Arial, sans-serif"
                                fontSize="11" fontWeight="700">
                            {valFmt(v)}
                          </text>
                        )}
                      </g>
                    );
                  })}
                  <text
                    x={groupX + groupW / 2}
                    y={H - padB + 20}
                    textAnchor={rotated ? 'end' : 'middle'}
                    fill="#495057" fontFamily="Arial, sans-serif" fontSize="11"
                    transform={rotated ? `rotate(-40, ${groupX + groupW / 2}, ${H - padB + 20})` : undefined}
                  >
                    {String(label).length > 22 ? String(label).slice(0, 20) + '…' : String(label)}
                  </text>
                </g>
              );
            })}

            {/* baseline */}
            <line x1={padL} x2={W - padR} y1={padT + innerH} y2={padT + innerH} stroke="#dde1e7" />

            {/* legenda */}
            {legend && (
              <g>
                {series.map((s, si) => {
                  const lx = padL + si * 160;
                  const ly = H - padB + 50;
                  return (
                    <g key={si}>
                      <rect x={lx} y={ly - 9} width="12" height="12" fill={`url(#bar-${id}-${si})`} rx="2" />
                      <text x={lx + 18} y={ly + 1} fontFamily="Arial, sans-serif" fontSize="11" fill="#495057">
                        {s.label ?? `Série ${si + 1}`}
                      </text>
                    </g>
                  );
                })}
              </g>
            )}
          </svg>
        </div>
      )}
    </>
  );
}

/* ============================================================
 * DoughnutChart — rosca com legenda lateral.
 *   props:
 *     title       — string
 *     labels      — string[]
 *     values      — number[]
 *     palette     — string[]?   (override de cores)
 *     unit        — string?     ("corretivas", "veículos", ...)
 *     centerLabel — string?     ("Total" por padrão)
 * ============================================================ */
export function DoughnutChart({ title, labels, values, palette, unit = '', centerLabel = 'Total' }) {
  const items = (labels ?? []).map((l, i) => ({
    label: String(l ?? ''),
    value: Number(values?.[i] ?? 0),
  })).filter((d) => d.value > 0);

  const total = items.reduce((s, d) => s + d.value, 0);

  const pal = palette ?? ['#fbbf24', '#f59e0b', '#fb923c', '#ea580c', '#a855f7', '#6366f1', '#06b6d4', '#10b981', '#ef4444', '#3b82f6'];

  const size = 220;
  const cx = size / 2, cy = size / 2;
  const rO = 95, rI = 60;

  const arcPath = (s, e) => {
    const a0 = s * 2 * Math.PI - Math.PI / 2;
    const a1 = e * 2 * Math.PI - Math.PI / 2;
    const x0o = cx + rO * Math.cos(a0), y0o = cy + rO * Math.sin(a0);
    const x1o = cx + rO * Math.cos(a1), y1o = cy + rO * Math.sin(a1);
    const x0i = cx + rI * Math.cos(a1), y0i = cy + rI * Math.sin(a1);
    const x1i = cx + rI * Math.cos(a0), y1i = cy + rI * Math.sin(a0);
    const large = e - s > 0.5 ? 1 : 0;
    return `M ${x0o} ${y0o} A ${rO} ${rO} 0 ${large} 1 ${x1o} ${y1o} L ${x0i} ${y0i} A ${rI} ${rI} 0 ${large} 0 ${x1i} ${y1i} Z`;
  };

  let acc = 0;
  const slices = items.map((d, i) => {
    const s = acc / (total || 1);
    acc += d.value;
    const e = acc / (total || 1);
    return {
      ...d,
      color: pal[i % pal.length],
      pct: total > 0 ? (d.value / total) * 100 : 0,
      path: total > 0 ? arcPath(s, e) : null,
    };
  });

  return (
    <>
      <h4 className="text-gray-700 mb-2"
          style={{ fontFamily: 'Arial, sans-serif', fontSize: 13, fontWeight: 700 }}>
        {title}
      </h4>

      {total === 0 ? (
        <div className="flex-1 flex items-center justify-center text-gray-400 border border-dashed rounded"
             style={{ fontFamily: 'Arial, sans-serif', fontSize: 12, minHeight: 280 }}>
          Sem dados para exibir.
        </div>
      ) : (
        <div className="flex-1 flex items-center gap-6 flex-wrap" style={{ minHeight: 280 }}>
          <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
            <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
              {slices.length === 1 ? (
                <>
                  <circle cx={cx} cy={cy} r={rO} fill={slices[0].color} />
                  <circle cx={cx} cy={cy} r={rI} fill="#ffffff" />
                </>
              ) : (
                slices.map((s, i) => (
                  <path key={i} d={s.path} fill={s.color}>
                    <title>{`${s.label}: ${s.value} (${s.pct.toFixed(1)}%)`}</title>
                  </path>
                ))
              )}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
                 style={{ fontFamily: 'Arial, sans-serif' }}>
              <span className="text-gray-500" style={{ fontSize: 11 }}>{centerLabel}</span>
              <span className="font-bold text-gray-800" style={{ fontSize: 24, lineHeight: 1 }}>
                {total.toLocaleString('pt-BR')}
              </span>
              {unit && <span className="text-gray-500" style={{ fontSize: 11 }}>{unit}</span>}
            </div>
          </div>

          <ul className="flex-1 min-w-[180px] space-y-1.5"
              style={{ fontFamily: 'Arial, sans-serif', fontSize: 11 }}>
            {slices.map((s, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="w-3 h-3 rounded flex-shrink-0" style={{ background: s.color }} />
                <span className="text-gray-700 font-semibold truncate" title={s.label}>
                  {s.label}
                </span>
                <span className="text-gray-500 ml-auto tabular-nums">{s.value}</span>
                <span className="text-gray-700 font-bold tabular-nums w-14 text-right">{s.pct.toFixed(1)}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
