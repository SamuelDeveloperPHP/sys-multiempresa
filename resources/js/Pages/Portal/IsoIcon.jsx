// Small isometric pictograms. Boxes: [x, y, z, w, d, h, [front, side, top]];
// cylinders: ['c', cx, cy, z, r, h, [side, top], hole] for tyres, posts and pedestals.
const iso = (x, y, z) => [(x - y) * 0.866, (x + y) * 0.5 - z];
const RX = 1.2247, RY = 0.7071; // A ground circle of radius r projects to an ellipse r*RX by r*RY.

function Box({ b: [x, y, z, w, d, h, [front, side, top]] }) {
    const X = x + w, Y = y + d, Z = z + h;
    const poly = (pts, fill) => <polygon fill={fill} points={pts.map(p => iso(...p).join(',')).join(' ')} />;
    return <>
        {poly([[x, Y, z], [X, Y, z], [X, Y, Z], [x, Y, Z]], front)}
        {poly([[X, y, z], [X, Y, z], [X, Y, Z], [X, y, Z]], side)}
        {poly([[x, y, Z], [X, y, Z], [X, Y, Z], [x, Y, Z]], top)}
    </>;
}

function Cylinder({ c: [, cx, cy, z, r, h, [side, top], hole] }) {
    const [x, yBottom] = iso(cx, cy, z), yTop = yBottom - h, rx = r * RX, ry = r * RY;
    return <>
        <ellipse cx={x} cy={yBottom} rx={rx} ry={ry} fill={side} />
        <rect x={x - rx} y={yTop} width={rx * 2} height={h} fill={side} />
        <ellipse cx={x} cy={yTop} rx={rx} ry={ry} fill={top} />
        {hole && <ellipse cx={x} cy={yTop} rx={rx * hole} ry={ry * hole} fill={side} />}
    </>;
}

const steel = ['#526780', '#364a64', '#91a2af'];
const teal = ['#278c99', '#166577', '#62b5bc'];
const amber = ['#df7a33', '#af4d23', '#f5a65c'];
const light = ['#d8e5e8', '#9eb8c2', '#f6fbfa'];
const dark = ['#2d3e50', '#222f42', '#495b69'];
const glow = ['#60dfc2', '#3fb39b', '#88ffe1'];
const tyre = ['#222f42', '#3b4c5e'];

const scenes = {
    // Covered dock with a truck parked at the bay.
    dock: [[0, 0, 0, 40, 30, 22, steel], [-1, -1, 22, 42, 32, 2, amber], [44, 4, 0, 16, 24, 3, dark], [44, 6, 3, 14, 20, 12, light], [44, 26, 3, 14, 7, 9, teal],
        ['c', 58, 10, 0, 3, 5, tyre], ['c', 58, 29, 0, 3, 5, tyre]],
    // Round pedestal holding a glowing key ring: rentals.
    rental: [['c', 14, 14, 0, 24, 8, ['#222f42', '#495b69']], ['c', 14, 14, 8, 9, 24, ['#166577', '#62b5bc']], ['c', 14, 14, 32, 17, 7, ['#3fb39b', '#88ffe1'], .55]],
    // Workshop lift with round posts and a raised vehicle.
    maintenance: [[0, 0, 0, 44, 30, 3, dark], ['c', 6, 6, 3, 3, 18, ['#af4d23', '#f5a65c']], ['c', 38, 6, 3, 3, 18, ['#af4d23', '#f5a65c']],
        [6, 6, 21, 32, 18, 9, light], [10, 8, 30, 20, 14, 6, teal], ['c', 6, 24, 3, 3, 18, ['#af4d23', '#f5a65c']], ['c', 38, 24, 3, 3, 18, ['#af4d23', '#f5a65c']]],
    // Telemetry tower with a signal ring beside a tracked truck cab.
    tracking: [[0, 0, 0, 22, 22, 4, dark], ['c', 11, 11, 4, 3, 42, ['#7d8a94', '#c3ccd3']], ['c', 11, 11, 46, 9, 2, ['#3fb39b', '#88ffe1'], .6],
        [30, 14, 0, 26, 30, 3, dark], [32, 16, 3, 22, 26, 16, teal], [34, 30, 19, 18, 10, 5, glow]],
    // Stacked tyres beside a single one on the inspection mat.
    tyres: [['c', 4, 4, 0, 16, 9, tyre, .45], ['c', 4, 4, 9, 16, 9, tyre, .45], ['c', 4, 4, 18, 16, 9, tyre, .45],
        ['c', 34, 30, 0, 19, 3, ['#3fb39b', '#88ffe1']], ['c', 34, 30, 3, 15, 9, tyre, .45]],
};

export default function IsoIcon({ scene, className = 'h-24 w-32' }) {
    return <svg viewBox="-42 -38 104 88" className={className} aria-hidden="true">
        {scenes[scene].map((part, i) => part[0] === 'c' ? <Cylinder key={i} c={part} /> : <Box key={i} b={part} />)}
    </svg>;
}
