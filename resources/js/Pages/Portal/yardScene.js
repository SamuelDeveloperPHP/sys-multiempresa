// Low-poly city block around the fleet yard, drawn on a 2D canvas with an orthographic camera.
// laneAt() is the single source of truth for the scene, the bay cards and the event feed.

export const travel = 2600, service = 3400, cycle = travel * 2 + service;
export const VIEW = { width: 1200, height: 560 };
const S = .85, OX = 513, OY = 175;
export const project = (x, y, z = 0) => [OX + (x * .83 - y * .66) * S, OY + (x * .32 + y * .36 - z * .86) * S];

const colors = [['#e9773a','#c45a26','#f59a62'], ['#2a9aa8','#1d7582','#5ec2cb'], ['#4f7fc0','#3a6299','#7ea6dc'], ['#f2c94c','#cfa52c','#f9de84'], ['#d9534f','#b03c38','#ec7b77']];
const glass = ['#8ec5da','#6aa6be','#c4e4ef'];
const lights = ['#ffe9a8','#e0c27a','#fff4cf'], tail = ['#e0524a','#b53a33','#f07a72'];
const dark = ['#2d3e50','#222f42','#495b69'], white = ['#eef3f5','#c4d0d7','#ffffff'], steel = ['#9aa7b1','#7d8a94','#c3ccd3'];

// Each plate is always the same vehicle, so a bus rented in Retirada comes back as a bus.
const plates = [['RTA2C41','truck'],['QOK7B19','car'],['SBF4E02','van'],['PLM1A88','bus'],['TUV6D35','car'],['KDE3F70','van'],['MNO8G21','truck'],['BRS5H46','bus'],['FGT9J13','van']];
const preventive = [['LMN4P12','truck'],['XZA7Q90','bus'],['CDF2R33','car']];
export const kinds = { truck: 'Caminhão', bus: 'Ônibus', van: 'Van', car: 'Carro' };

export const bays = [
    { code: 'RET', name: 'Retirada', tone: '#60dfc2' },
    { code: 'VIS', name: 'Vistoria', tone: '#ffb544' },
    { code: 'OFI', name: 'Oficina', tone: '#86a8cf' },
];
export const tags = { RET: '#60dfc2', VIS: '#ffb544', OFI: '#86a8cf', GPS: '#7cc4ff' };

const mod = (a, b) => ((a % b) + b) % b;
const easeOut = p => 1 - (1 - p) * (1 - p);
const easeIn = p => p * p;

// Vehicle models in local coordinates: a = across (0..46, visible side at the high end), b = along (0 rear .. L front).
const ribs = Array.from({ length: 11 }, (_, k) => [49, 5 + k * 7, 11, .6, 1, 31, ['#bccfd3','#b5cbd1','#dde8e9']]);
const models = {
    car: { L: 80, W: 46, wheels: [[16, 46], [64, 46]], parts: c => [
        [0,0,5,46,80,15,c], [3,12,20,40,48,11,glass], [3,14,31,40,44,2,c],
        [3,80,12,9,.5,3,lights], [34,80,12,9,.5,3,lights], [3,-.5,12,9,.5,3,tail], [34,-.5,12,9,.5,3,tail]] },
    van: { L: 84, W: 46, wheels: [[16, 46], [68, 46]], parts: c => [
        [0,0,5,46,84,30,c], [4,84,22,38,.5,10,glass], [46,54,22,.5,26,9,glass],
        [3,84,11,9,.5,3,lights], [34,84,11,9,.5,3,lights], [3,-.5,11,9,.5,3,tail], [34,-.5,11,9,.5,3,tail]] },
    truck: { L: 114, W: 46, wheels: [[15, 50], [32, 50], [103, 50]], parts: c => [
        [-3,3,6,52,108,5,dark], [-3,0,9,52,82,36,white], ...ribs, [-4,84,8,55,30,26,c], [-1,85,34,49,15,5,c],
        [0,114,22,47,.5,10,['#214759','#26495b','#547888']], [10,114,12,27,1,5,['#304255','#304255','#606e75']],
        [-5,114,6,57,2,3,['#abbcc5','#8093a2','#c6d6d9']], [-1,114,11,8,1,3,lights], [38,114,11,8,1,3,lights],
        [-1,-.5,12,8,.5,4,tail], [41,-.5,12,8,.5,4,tail]] },
    bus: { L: 132, W: 48, wheels: [[22, 48], [108, 48]], parts: c => [
        [0,0,5,48,132,34,c], [2,2,39,44,128,2,white], [48,12,22,.5,108,11,glass], [48,8,8,.5,124,3,white],
        [4,132,18,40,.5,17,glass], [12,132,36,24,.5,3,['#1d2b36','#1d2b36','#3a4a56']],
        [3,132,9,9,.5,3,lights], [36,132,9,9,.5,3,lights], [3,-.5,10,9,.5,4,tail], [36,-.5,10,9,.5,4,tail]] },
    forklift: { L: 40, W: 24, wheels: [[8, 24], [30, 24]], parts: (c, carrying) => {
        const fz = carrying ? 7 : 3;
        return [
            [0,0,2,24,8,12,dark], [0,8,2,24,18,11,['#f2c230','#cf9f1d','#ffd95a']], [6,10,13,12,8,5,dark],
            [1,8,13,2,2,16,steel], [21,8,13,2,2,16,steel], [1,22,13,2,2,16,steel], [21,22,13,2,2,16,steel], [0,7,29,24,18,2,dark],
            [3,27,2,3,3,30,steel], [18,27,2,3,3,30,steel], [3,27,30,18,3,2,steel],
            [5,30,fz,4,10,1,steel], [15,30,fz,4,10,1,steel],
            ...(carrying ? [[2,29,fz+1,20,12,2,['#a5764a','#87603b','#c08d5c']], [3,30,fz+3,18,10,10,['#c99a62','#a87c48','#e0b77f']]] : []),
        ];
    } },
};
export const lengths = Object.fromEntries(Object.entries(models).map(([k, m]) => [k, m.L]));
const heavy = kind => kind === 'truck' || kind === 'bus';

export function laneAt(i, elapsed) {
    const phase = elapsed + i * cycle / 3, n = Math.floor(phase / cycle), t = phase % cycle;
    const step = t < travel ? 0 : t < travel + service ? 1 : 2;
    // One story across bays: the vehicle rented in Retirada cycle n comes back to Vistoria in cycle n+2,
    // and a vehicle flagged in Vistoria cycle m reaches the Oficina in cycle m+2.
    const rented = r => ({ vehicle: plates[mod(r, plates.length)], contract: 1040 + r });
    const flaggedAt = m => mod(m, 3) === 2;
    const fromInspection = i === 2 && flaggedAt(n - 2);
    const { vehicle: [plate, kind], contract } = i === 0 ? rented(n) : i === 1 ? rented(n - 2)
        : fromInspection ? rented(n - 4) : { vehicle: preventive[mod(n, preventive.length)], contract: null };
    const who = `${kinds[kind]} ${plate}`;
    const flagged = i === 1 && flaggedAt(n);
    const job = fromInspection ? 'troca de pneus' : 'revisão preventiva';
    const speed = 38 + mod(n * 7 + i * 5, 24);
    const status = [
        ['Preparando', 'Check-out', 'Locado'],
        ['Devolução', 'Em vistoria', flagged ? 'Para oficina' : 'Disponível'],
        ['Entrando', 'Em manutenção', 'Liberado'],
    ][i][step];

    // Vehicles arrive on the far lane of the front road, turn nose-first into the bay,
    // then reverse out onto the near lane and drive off to the right.
    const L = lengths[kind], laneX = 8 + i * 116, center = laneX + 39;
    let pose;
    if (step === 1) pose = { dir: '-y', x0: laneX + 16, y0: 22, segment: 'bay' };
    else if (step === 0) {
        const xTurn = center - L / 2, dRoad = 1500 - xTurn, yStart = 424 - L / 2, dLane = yStart - 22;
        const s = easeOut(t / travel) * (dRoad + dLane);
        pose = s < dRoad ? { dir: '-x', x0: 1500 - s, y0: 401, segment: 'road' }
            : { dir: '-y', x0: laneX + 16, y0: yStart - (s - dRoad), segment: 'lane' };
    } else {
        const yEnd = 368 - L / 2, dLane = yEnd - 22, xStart = center - L / 2, dRoad = 1500 - xStart;
        const s = easeIn((t - travel - service) / travel) * (dLane + dRoad);
        pose = s < dLane ? { dir: '-y', x0: laneX + 16, y0: 22 + s, segment: 'lane' }
            : { dir: '+x', x0: xStart + s - dLane, y0: 345, segment: 'road' };
    }
    const departed = step === 2 && pose.segment === 'road';
    const bayEvent = [
        [`${who} pronto para retirada`, `${who} em check-out · #${contract}`, `${who} locado · saiu do pátio`],
        [`${who} devolvido · #${contract}`, `${who} em vistoria: km e pneus`, flagged ? `${who} com pneu gasto → oficina` : `${who} aprovado · disponível`],
        [fromInspection ? `${who} chegou da vistoria` : `${who} entrou para revisão`, `${who} em ${job}`, `${who} liberado para locação`],
    ][i][step];
    const gpsEvent = [
        `${who} em rota · ${speed} km/h`,
        flagged ? `${who} a caminho da oficina · ${speed} km/h` : `${who} seguiu para o estacionamento`,
        `${who} saiu da oficina · rastreador ativo`,
    ][i];
    return { n, t, step, plate, kind, status, pose,
        key: `${n}:${departed ? 3 : step}`, tag: departed ? 'GPS' : bays[i].code, event: departed ? gpsEvent : bayEvent,
        color: colors[mod(i + n, colors.length)], progress: Math.max(0, Math.min(1, (t - travel) / service)) };
}

// ---------------------------------------------------------------- static scenery
function random(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
const rng = random(11);
const onScreen = (x, y, margin = 90) => {
    const [sx, sy] = project(x, y, 0);
    return sx > -margin && sx < VIEW.width + margin && sy > -margin && sy < VIEW.height + margin * 1.6;
};
const greens = [['#4f9a4f','#6dbb5f','#3d7f40'], ['#5aa84f','#7cc56a','#468a3f'], ['#3f8c4a','#5aab5e','#2f7039']];
function grove(x1, x2, y1, y2, step, sizes) {
    const out = [];
    for (let y = y1; y <= y2; y += step) for (let x = x1; x <= x2; x += step) {
        const tx = x + (rng() - .5) * step * .6, ty = y + (rng() - .5) * step * .6;
        const size = sizes[0] + rng() * (sizes[1] - sizes[0]), tone = greens[Math.floor(rng() * greens.length)];
        if (onScreen(tx, ty)) out.push([tx, ty, size, tone]);
    }
    return out;
}
const backTrees = grove(-500, 1000, -620, -262, 44, [16, 24]).sort((a, b) => a[0] + a[1] - b[0] - b[1]);
const frontTrees = [...grove(-60, 470, 492, 760, 50, [15, 22]), ...grove(-900, -250, -80, 300, 70, [15, 21]),
    ...grove(-900, -250, 490, 900, 50, [16, 22]), ...grove(860, 1200, 480, 760, 55, [15, 21]), ...grove(900, 1300, -90, 300, 60, [15, 21])];
const lamps = [[-92, 331], [494, 331], [-80, 459], [110, 459], [300, 459], [480, 459], [618, -40], [618, 160], [640, 459], [850, 459]];
const parked = [['car', 650, -60, 0], ['van', 712, -60, 2], ['bus', 774, -80, 1], ['car', 836, -60, 4], ['truck', -560, -40, 3], ['van', -498, -40, 1], ['car', -436, -40, 2]]
    .filter(([, x, y]) => onScreen(x, y, 200));

// Isometric depth ordering for boxes that do not overlap on the ground plane.
function order(items) {
    const n = items.length, after = items.map(() => []), indeg = new Array(n).fill(0);
    for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) {
        if (a === b) continue;
        const A = items[a], B = items[b];
        const xBehind = A.x1 <= B.x0, yBehind = A.y1 <= B.y0, xFront = B.x1 <= A.x0, yFront = B.y1 <= A.y0;
        if ((xBehind && !yFront) || (yBehind && !xFront)) { after[a].push(b); indeg[b]++; }
    }
    const depth = i => items[i].x0 + items[i].x1 + items[i].y0 + items[i].y1, done = new Array(n).fill(false), out = [];
    for (let k = 0; k < n; k++) {
        let pick = -1;
        for (let i = 0; i < n; i++) if (!done[i] && indeg[i] === 0 && (pick < 0 || depth(i) < depth(pick))) pick = i;
        if (pick < 0) for (let i = 0; i < n; i++) if (!done[i] && (pick < 0 || depth(i) < depth(pick))) pick = i;
        done[pick] = true; out.push(items[pick]);
        for (const b of after[pick]) indeg[b]--;
    }
    return out;
}

// ---------------------------------------------------------------- painter
export function paint(ctx, time, selected) {
    const TAU = Math.PI * 2;
    function face(points, color) {
        ctx.beginPath();
        points.map(p => project(...p)).forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
        ctx.closePath(); ctx.fillStyle = color; ctx.fill();
    }
    function box(x, y, z, w, d, h, [front, side, top]) {
        const X = x + w, Y = y + d, Z = z + h;
        face([[x, Y, z], [X, Y, z], [X, Y, Z], [x, Y, Z]], front);
        face([[X, y, z], [X, Y, z], [X, Y, Z], [X, y, Z]], side);
        face([[x, y, Z], [X, y, Z], [X, Y, Z], [x, Y, Z]], top);
    }
    const quad = (x1, y1, x2, y2, color, z = 0) => face([[x1, y1, z], [x2, y1, z], [x2, y2, z], [x1, y2, z]], color);
    function cylinder(x, y, z, r, h, [side, top]) {
        const [cx, cy] = project(x, y, z), rx = r * 1.06 * S, ry = r * .48 * S, hh = h * .86 * S;
        ctx.fillStyle = side; ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU); ctx.fill();
        ctx.fillRect(cx - rx, cy - hh, rx * 2, hh);
        ctx.fillStyle = top; ctx.beginPath(); ctx.ellipse(cx, cy - hh, rx, ry, 0, 0, TAU); ctx.fill();
    }
    function text(label, x, y, z, size, color, axis = 'x') {
        const [sx, sy] = project(x, y, z);
        ctx.save(); ctx.translate(sx, sy);
        if (axis === 'x') ctx.transform(1, .385, 0, 1, 0, 0); else ctx.transform(.83, .32 / .83 * .83, -.66, .36, 0, 0);
        ctx.fillStyle = color; ctx.font = `800 ${size}px system-ui, sans-serif`; ctx.fillText(label, 0, 0); ctx.restore();
    }
    function hex(cx, cy, r, [base, light, shade]) {
        const pts = Array.from({ length: 6 }, (_, k) => [cx + r * Math.cos(Math.PI / 6 + k * Math.PI / 3), cy + r * .9 * Math.sin(Math.PI / 6 + k * Math.PI / 3)]);
        const poly = (p, c) => { ctx.beginPath(); p.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.fillStyle = c; ctx.fill(); };
        poly(pts, base); poly([[cx, cy], pts[2], pts[3], pts[4]], light); poly([[cx, cy], pts[5], pts[0], pts[1]], shade);
    }
    function tree(x, y, size, tone) {
        const [gx, gy] = project(x, y, 0);
        ctx.beginPath(); ctx.ellipse(gx + 7 * S, gy + 2 * S, size * .9 * S, size * .42 * S, 0, 0, TAU); ctx.fillStyle = 'rgba(20,45,25,.22)'; ctx.fill();
        box(x - 2, y - 2, 0, 4, 4, size * .9, ['#7a5236', '#5d3d27', '#8a6040']);
        hex(...project(x, y, size * 1.05), size * .8 * S, tone);
        hex(...project(x, y, size * 1.65), size * .56 * S, tone);
    }
    function lamp(x, y) {
        box(x, y, 0, 2.5, 2.5, 46, steel);
        box(x, y, 44, 12, 2.5, 2, steel);
        box(x + 8, y - 1, 40, 7, 4.5, 4, lights);
    }
    function place([a, b, pz, wa, db, h, col], L, dir, x0, y0, z) {
        if (dir === '+y') return [x0 + a, y0 + b, z + pz, wa, db, h, col];
        if (dir === '-y') return [x0 + a, y0 + L - b - db, z + pz, wa, db, h, col];
        if (dir === '+x') return [x0 + b, y0 + a, z + pz, db, wa, h, col];
        return [x0 + L - b - db, y0 + a, z + pz, db, wa, h, col];
    }
    const footprint = (kind, dir) => { const m = models[kind]; return dir[1] === 'y' ? [m.W, m.L] : [m.L, m.W]; };
    function vehicle(kind, dir, x0, y0, z, color, extra) {
        const m = models[kind], L = m.L, along = dir[1] === 'y', forward = dir[0] === '+', [w, d] = footprint(kind, dir);
        quad(x0 - 4, y0 - 4, x0 + w + 4, y0 + d + 4, 'rgba(25,35,45,.25)');
        for (const [b, a] of m.wheels) {
            const bb = forward ? b : L - b, [wx, wy] = along ? [x0 + a, y0 + bb] : [x0 + bb, y0 + a];
            const [cx, cy] = project(wx, wy, z + 5);
            ctx.beginPath(); ctx.arc(cx, cy, 5 * S, 0, TAU); ctx.fillStyle = '#1c2a37'; ctx.fill();
        }
        // Hidden faces are skipped: headlights when driving away from the camera, tail lights otherwise.
        let parts = m.parts(color, extra).filter(p => forward ? p[1] >= 0 : p[1] < L).map(p => place(p, L, dir, x0, y0, z));
        if (!forward) parts = parts.map((p, k) => [p, k]).sort((A, B) => (A[0][0] + A[0][1]) - (B[0][0] + B[0][1]) || A[1] - B[1]).map(p => p[0]);
        for (const p of parts) box(...p);
    }
    function pin(x, y, z) {
        const [px, py] = project(x, y, z), bob = Math.sin(time / 300) * 2;
        ctx.beginPath(); ctx.ellipse(px, py + 18, 9 + (time / 40 % 10), 4 + (time / 40 % 10) * .45, 0, 0, TAU);
        ctx.strokeStyle = 'rgba(47,212,176,.55)'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(px, py + bob); ctx.arc(px, py - 10 + bob, 6.5, Math.PI * .8, Math.PI * .2); ctx.closePath();
        ctx.fillStyle = '#16b89a'; ctx.fill();
        ctx.beginPath(); ctx.arc(px, py - 10 + bob, 2.6, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill();
        return [px, py - 10 + bob];
    }

    // ---- ground: grass, pavings, roads, sidewalks
    ctx.clearRect(0, 0, VIEW.width, VIEW.height);
    ctx.fillStyle = '#8cc56f'; ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    quad(626, 466, 1400, 1400, '#dfe5e9');
    quad(626, -106, 1400, 326, '#8f9aa2');
    for (let x = 640; x < 1300; x += 62) quad(x, -100, x + 2, -10, '#e6ebee');
    quad(-1400, -106, -226, 326, '#8f9aa2');
    for (let x = -1380; x < -240; x += 62) quad(x, -100, x + 2, -10, '#e6ebee');
    const asphalt = '#555f68';
    quad(-3000, 340, 3000, 452, asphalt); quad(500, -3000, 612, 3000, asphalt);
    quad(-3000, -232, 3000, -120, asphalt); quad(-212, -3000, -100, 3000, asphalt);
    const gap = (v, ranges) => ranges.some(([a, b]) => v + 30 > a && v < b);
    for (let x = -1500; x < 2000; x += 60) {
        if (!gap(x, [[490, 622], [-222, -90]])) { quad(x, 394, x + 30, 398, '#f3f5f6'); quad(x, -178, x + 30, -174, '#f3f5f6'); }
    }
    for (let y = -1500; y < 2000; y += 60) {
        if (!gap(y, [[330, 462], [-242, -110]])) { quad(554, y, 558, y + 30, '#f3f5f6'); quad(-158, y, -154, y + 30, '#f3f5f6'); }
    }
    for (let k = 0; k < 7; k++) { quad(470, 346 + k * 15, 492, 354 + k * 15, '#eef1f3'); quad(620, 346 + k * 15, 642, 354 + k * 15, '#eef1f3'); }
    const curb = ['#c9d2d8', '#b3bec6', '#eef2f4'];
    const blocks = [[-100, 500, 452, 1400], [612, 1400, 452, 1400], [612, 1400, -120, 340], [-1400, -212, -120, 340],
        [-1400, -212, 452, 1400], [-1400, -212, -1400, -232], [-100, 500, -1400, -232], [612, 1400, -1400, -232]];
    for (const [x1, x2, y1, y2] of blocks) {
        box(x1, y1, 0, x2 - x1, 14, 3, curb); box(x1, y1, 0, 14, y2 - y1, 3, curb);
        box(x2 - 14, y1, 0, 14, y2 - y1, 3, curb); box(x1, y2 - 14, 0, x2 - x1, 14, 3, curb);
    }
    // Yard block: curbs on three sides, open driveway along the front road.
    box(-100, -120, 0, 600, 14, 3, curb); box(-100, -120, 0, 14, 460, 3, curb); box(486, -120, 0, 14, 460, 3, curb);
    quad(-86, 326, 486, 340, '#d7dee3');
    quad(-86, -106, 486, 326, '#c7d0d6');
    for (let x = -46; x < 486; x += 44) quad(x, -106, x + 1, 326, '#b9c3ca');
    for (let y = -66; y < 326; y += 44) quad(-86, y, 486, y + 1, '#b9c3ca');
    quad(368, -76, 424, 66, '#f2c94c'); quad(371, -73, 421, 63, '#c7d0d6');

    for (let i = 0; i < 3; i++) {
        const x = 8 + i * 116;
        for (const edge of [-7, 86]) quad(x + edge, 17, x + edge + 3, 326, '#f2c94c');
        quad(x - 4, 17, x + 86, 20, '#f6f8f9');
        if (i === selected) for (const edge of [0, 78]) quad(x + edge, 20, x + edge + 2, 200, '#2fd4b0');
    }
    face([[340, -78, 0], [372, -60, 0], [372, 28, 0], [340, 10, 0]], 'rgba(30,40,50,.25)');

    // ---- behind the warehouse
    for (const [x, y, size, tone] of backTrees) tree(x, y, size, tone);

    // ---- warehouse
    box(-24, -78, 0, 364, 88, 73, ['#e6ebee', '#c3ccd3', '#f4f7f8']);
    box(-24, 10, 58, 364, .6, 7, ['#ffb544', '#e0952a', '#ffd08a']);
    box(340, -78, 58, .6, 88, 7, ['#ffb544', '#e0952a', '#ffd08a']);
    box(-28, -82, 73, 372, 96, 5, ['#2f6f9a', '#25597d', '#3f86b8']);
    for (let k = 0; k < 6; k++) { box(4 + k * 56, -74, 78, 34, 12, 2, ['#cfe9f5', '#a9cfe0', '#e8f6fc']); box(4 + k * 56, -6, 78, 34, 12, 2, ['#cfe9f5', '#a9cfe0', '#e8f6fc']); }
    text('PÁTIO DA FROTA', 30, -30, 78.5, 19, '#eaf6fb', 'roof');
    for (let i = 0; i < 3; i++) {
        const x = 8 + i * 116, lane = laneAt(i, time);
        box(x, 10, 0, 82, 3, 53, ['#33434f', '#2a3843', '#8796a1']);
        for (let k = 1; k <= 6; k++) box(x + 2, 13, k * 7, 78, 1, 1, ['#5b6c78', '#5b6c78', '#5b6c78']);
        const signal = lane.step === 1 ? bays[i].tone : '#7f8f9b';
        box(x + 2, 14, 54, 78, 2, 3, [signal, signal, signal]);
        text(bays[i].code, x + 30, 15, 66, 11, '#1d2b36');
    }

    // ---- depth-sorted objects
    const items = [];
    const add = (x0, x1, y0, y1, draw) => items.push({ x0, x1, y0, y1, draw });
    const post = ['#df7a33', '#af4d23', '#f5a65c'];
    for (const [px, py] of [[243, 24], [315, 24], [243, 96], [315, 96]]) add(px, px + 4, py, py + 4, () => box(px, py, 0, 4, 4, 30, post));
    add(372, 418, -70, 60, () => {
        box(372, -70, 0, 46, 130, 42, ['#2f6fa8', '#255a8a', '#4a8cc4']);
        for (let k = 0; k < 16; k++) box(418, -66 + k * 8, 3, .6, 2, 36, ['#3f7fb8', '#3f7fb8', '#3f7fb8']);
        box(374, 60, 4, 42, .6, 34, ['#285f93', '#285f93', '#285f93']);
    });
    for (const [cx, cy, high] of [[458, 120, 2], [458, 160, 1], [458, 200, 2], [458, 240, 1]]) add(cx, cx + 26, cy, cy + 30, () => {
        box(cx, cy, 0, 26, 30, 3, ['#a5764a', '#87603b', '#c08d5c']);
        for (let h = 0; h < high; h++) box(cx + 2, cy + 2, 3 + h * 13, 22, 26, 12, ['#c99a62', '#a87c48', '#e0b77f']);
    });
    add(380, 420, 236, 300, () => {
        const barrels = [[388, 244, '#3f7fb8'], [404, 244, '#d9534f'], [388, 262, '#f2c94c'], [404, 262, '#3f7fb8'], [388, 280, '#d9534f'], [404, 280, '#3f7fb8']];
        for (const [bx, by, c] of barrels) cylinder(bx, by, 0, 7, 19, [c, '#e6ebee']);
    });
    // Forklift shuttling pallets between the container and the stacks.
    const lift = (time % 8000) / 8000, going = lift < .5, fy = 70 + (going ? easeOut(lift * 2) : 1 - easeOut((lift - .5) * 2)) * 120;
    add(426, 450, fy, fy + 40, () => vehicle('forklift', '+y', 426, fy, 0, null, going));
    for (const [x, y, size, tone] of frontTrees) add(x - size * .6, x + size * .6, y - size * .6, y + size * .6, () => tree(x, y, size, tone));
    for (const [x, y] of lamps) add(x, x + 14, y - 1, y + 4, () => lamp(x, y));
    for (const [kind, x, y, c] of parked) { const [w, d] = footprint(kind, '+y'); add(x, x + w, y, y + d, () => vehicle(kind, '+y', x, y, 0, colors[c])); }
    // Telemetry centre: building and lattice tower that receive the trackers' signal.
    add(640, 760, 470, 540, () => {
        box(640, 470, 0, 120, 70, 34, ['#dfe7ec', '#b9c6cf', '#f0f4f6']);
        for (let k = 0; k < 6; k++) box(648 + k * 18, 540, 12, 12, .5, 12, glass);
        for (let k = 0; k < 4; k++) box(760, 478 + k * 16, 12, .5, 10, 12, glass);
        box(637, 467, 34, 126, 76, 3, ['#2a3f52', '#1f3242', '#3b546a']);
        text('TELEMETRIA', 655, 500, 37.5, 12, '#d9f7ef', 'roof');
    });
    // Tracker antenna inside the yard: every vehicle on the road links back to it.
    add(452, 476, 280, 304, () => {
        box(452, 280, 0, 24, 24, 4, ['#c9d2d8', '#b3bec6', '#eef2f4']);
        box(454, 282, 4, 10, 12, 10, ['#dfe7ec', '#b9c6cf', '#f0f4f6']);
        box(467, 289, 4, 5, 5, 86, steel);
        for (let z = 22; z < 86; z += 20) box(465, 287, z, 9, 9, 1.5, steel);
        const [dx, dy] = project(476, 291, 72);
        ctx.beginPath(); ctx.ellipse(dx, dy, 8, 5.5, -.5, 0, TAU); ctx.fillStyle = '#eef3f5'; ctx.fill();
        const [lx, ly] = project(469, 291, 92);
        ctx.beginPath(); ctx.arc(lx, ly, 2.6, 0, TAU); ctx.fillStyle = Math.floor(time / 600) % 2 ? '#ff5a4f' : '#7a2a26'; ctx.fill();
    });

    const yard = [0, 1, 2].map(i => laneAt(i, time));
    yard.forEach((lane, i) => {
        const { pose, kind } = lane, [w, d] = footprint(kind, pose.dir);
        const raise = i === 2 && lane.step === 1 && !heavy(kind) ? Math.min(1, (lane.t - travel) / 500, (travel + service - lane.t) / 500) * 16 : 0;
        add(pose.x0, pose.x0 + w, pose.y0, pose.y0 + d, () => {
            vehicle(kind, pose.dir, pose.x0, pose.y0, raise, lane.color);
            if (i === 1 && lane.step === 1) {
                const sy = pose.y0 - 4 + lane.progress * (d + 8);
                face([[pose.x0 - 8, sy, 0], [pose.x0 + w + 8, sy, 0], [pose.x0 + w + 8, sy, 50], [pose.x0 - 8, sy, 50]], 'rgba(255,181,68,.3)');
                box(pose.x0 - 8, sy, 50, w + 16, 1, 1, ['#ffb544', '#ffb544', '#ffd08a']);
            }
        });
    });
    for (const item of order(items)) item.draw();

    // ---- overlays: tracker pins linked to the tower, signal rings, check-out key
    const [tx, ty] = project(469, 291, 92);
    for (let k = 0; k < 3; k++) {
        const p = ((time / 1800) + k / 3) % 1;
        ctx.beginPath(); ctx.ellipse(tx, ty, 6 + p * 70, (6 + p * 70) * .5, 0, 0, TAU);
        ctx.strokeStyle = `rgba(47,212,176,${(1 - p) * .7})`; ctx.lineWidth = 2; ctx.stroke();
    }
    yard.forEach(lane => {
        if (lane.pose.segment !== 'road') return;
        const { pose, kind } = lane, [w, d] = footprint(kind, pose.dir), height = { car: 33, van: 35, truck: 45, bus: 41 }[kind];
        const [px, py] = pin(pose.x0 + w / 2, pose.y0 + d / 2, height + 12);
        ctx.save(); ctx.setLineDash([4, 5]); ctx.lineDashOffset = -time / 40;
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(tx, ty); ctx.strokeStyle = 'rgba(22,184,154,.55)'; ctx.lineWidth = 1.4; ctx.stroke(); ctx.restore();
    });
    const out = yard[0];
    if (out.step === 1) {
        const [w, d] = footprint(out.kind, out.pose.dir);
        const [kx, ky] = project(out.pose.x0 + w / 2, out.pose.y0 + d / 2, (heavy(out.kind) ? 64 : 52) + Math.sin(time / 250) * 3);
        ctx.save(); ctx.translate(kx, ky); ctx.rotate(Math.PI / 4);
        ctx.shadowColor = '#2fd4b0'; ctx.shadowBlur = 10; ctx.fillStyle = '#2fd4b0'; ctx.fillRect(-5, -5, 10, 10); ctx.restore();
    }
}
