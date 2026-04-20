/**
 * map.js — MetroGrid Dynamic Network Map
 *
 * A pure-visualization layer. Renders the 5-hub Indian supply network on an
 * HTML5 Canvas and reacts to backend algorithm results via updateMap().
 *
 *   updateMap('dijkstra', { route: [...], cost })     — Cyan path + drone
 *   updateMap('prim',     { edges: [[a,b,c],...] })   — Orange MST backbone
 *   updateMap('reset')                                 — Clear all highlights
 *
 * No fetch() calls. No backend coupling — just takes the data the backend
 * already returns and redraws the canvas.
 */

'use strict';

// ---------------------------------------------------------------------------
// STATIC CONFIG — Node positions + adjacency edges (must mirror backend)
// ---------------------------------------------------------------------------
const MAP_CONFIG = {
    canvasId: 'network-map',

    // Internal design resolution. CSS scales the canvas responsively but
    // all drawing coordinates are in this fixed 700x480 space.
    width:  700,
    height: 480,

    // Hardcoded (x, y) positions loosely based on real Indian geography:
    //   Delhi (north), Mumbai (west), Pune (near Mumbai), Hyderabad (central),
    //   Bangalore (south).
    nodes: {
        'Mumbai Central': { x: 120, y: 275, label: 'MUMBAI'    },
        'Pune Outpost':   { x: 215, y: 310, label: 'PUNE'      },
        'Bangalore Apex': { x: 290, y: 425, label: 'BANGALORE' },
        'Hyderabad Core': { x: 395, y: 335, label: 'HYDERABAD' },
        'Delhi Hub':      { x: 510, y: 75,  label: 'DELHI'     },
    },

    // All possible edges from the backend adjacency matrix (config.py).
    // Stored as [from, to, cost_km]. These are the faint gray background lines.
    edges: [
        ['Mumbai Central', 'Pune Outpost',     150],
        ['Pune Outpost',   'Hyderabad Core',   600],
        ['Pune Outpost',   'Bangalore Apex',   840],
        ['Hyderabad Core', 'Bangalore Apex',   570],
        ['Hyderabad Core', 'Delhi Hub',       1100],
    ],

    colors: {
        bg:          '#050505',
        gridLine:    'rgba(0, 240, 255, 0.04)',

        baseEdge:    'rgba(150, 150, 150, 0.22)',
        baseLabel:   '#5a5a5a',

        cyan:        '#00f0ff',
        cyanGlow:    'rgba(0, 240, 255, 0.55)',

        orange:      '#ff8c1a',
        orangeGlow:  'rgba(255, 140, 26, 0.55)',

        nodeFill:    '#0a0a0a',
        nodeStroke:  '#00f0ff',
        nodeLabel:   '#f0f0f0',

        droneCore:   '#ffffff',
    },
};

// ---------------------------------------------------------------------------
// MUTABLE STATE — Updated by updateMap(); consumed by draw loop
// ---------------------------------------------------------------------------
const mapState = {
    type:        null,  // 'dijkstra' | 'prim' | null
    pathNodes:   [],    // Ordered hub names for Dijkstra path
    mstEdges:    [],    // [[from, to, cost, step], ...] — grows as animation plays
    droneT:      0,     // Progress [0..1] of drone along full path
    pulsePhase:  0,     // Shared animation phase for pulses/glows
    mstTimeouts: [],    // IDs of pending setTimeout calls for MST animation
};

let mapAnimHandle = null;

// ---------------------------------------------------------------------------
// INIT — Called on DOM ready; sets canvas size and kicks off animation loop
// ---------------------------------------------------------------------------
function initMap() {
    const canvas = document.getElementById(MAP_CONFIG.canvasId);
    if (!canvas) return;

    canvas.width  = MAP_CONFIG.width;
    canvas.height = MAP_CONFIG.height;

    startMapAnimation();
}

function startMapAnimation() {
    if (mapAnimHandle) cancelAnimationFrame(mapAnimHandle);
    let last = performance.now();

    const tick = (now) => {
        const dt = Math.min((now - last) / 1000, 0.1);
        last = now;

        mapState.pulsePhase += dt * 2.2;

        // Advance drone only while a Dijkstra path is active
        if (mapState.type === 'dijkstra' && mapState.pathNodes.length > 1) {
            const segCount = mapState.pathNodes.length - 1;
            // Drone traverses one segment every ~1.4 seconds, then loops
            mapState.droneT += dt / (segCount * 1.4);
            if (mapState.droneT > 1) mapState.droneT = 0;
        }

        drawMap();
        mapAnimHandle = requestAnimationFrame(tick);
    };

    mapAnimHandle = requestAnimationFrame(tick);
}

// ---------------------------------------------------------------------------
// UTILITY — Produce a canonical key for an undirected edge
// ---------------------------------------------------------------------------
function _edgeKey(a, b) {
    return [a, b].sort().join('|');
}

function _findEdge(a, b) {
    const target = _edgeKey(a, b);
    return MAP_CONFIG.edges.find(e => _edgeKey(e[0], e[1]) === target);
}

// ---------------------------------------------------------------------------
// MAIN DRAW — Called every frame by the animation loop
// ---------------------------------------------------------------------------
function drawMap() {
    const canvas = document.getElementById(MAP_CONFIG.canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { width: W, height: H } = canvas;

    // 1. Background + grid
    ctx.fillStyle = MAP_CONFIG.colors.bg;
    ctx.fillRect(0, 0, W, H);
    _drawGrid(ctx, W, H);

    // 2. Compute which edges are highlighted (to dim them in the base pass)
    const highlightKeys = new Set();
    if (mapState.type === 'dijkstra') {
        for (let i = 0; i < mapState.pathNodes.length - 1; i++) {
            highlightKeys.add(_edgeKey(mapState.pathNodes[i], mapState.pathNodes[i + 1]));
        }
    } else if (mapState.type === 'prim') {
        // mstEdges grows one entry per animation step: [from, to, cost, step]
        mapState.mstEdges.forEach(([a, b]) => highlightKeys.add(_edgeKey(a, b)));
    }

    // 3. Draw all base (faint gray) edges — skip ones that will be highlighted
    MAP_CONFIG.edges.forEach(([a, b, cost]) => {
        if (!highlightKeys.has(_edgeKey(a, b))) {
            _drawEdge(ctx, a, b, cost, 'base');
        }
    });

    // 4. Draw highlighted edges on top
    if (mapState.type === 'dijkstra') {
        for (let i = 0; i < mapState.pathNodes.length - 1; i++) {
            const a = mapState.pathNodes[i];
            const b = mapState.pathNodes[i + 1];
            const edge = _findEdge(a, b);
            _drawEdge(ctx, a, b, edge ? edge[2] : '', 'cyan');
        }
    } else if (mapState.type === 'prim') {
        // Each entry: [from, to, cost, step].  Label format: "[N] cost km"
        mapState.mstEdges.forEach(([a, b, cost, step]) => {
            const label = `[${step}] ${cost} km`;
            _drawEdge(ctx, a, b, label, 'orange');
        });
    }

    // 5. Nodes go on top of edges
    Object.entries(MAP_CONFIG.nodes).forEach(([name, pos]) => {
        const isOnPath =
            (mapState.type === 'dijkstra' && mapState.pathNodes.includes(name)) ||
            (mapState.type === 'prim' && mapState.mstEdges.some(([a, b]) => a === name || b === name));
        _drawNode(ctx, name, pos, isOnPath);
    });

    // 6. Drone moves only on Dijkstra path
    if (mapState.type === 'dijkstra' && mapState.pathNodes.length > 1) {
        _drawDrone(ctx);
    }
}

// ---------------------------------------------------------------------------
// DRAW HELPERS
// ---------------------------------------------------------------------------

function _drawGrid(ctx, W, H) {
    ctx.save();
    ctx.strokeStyle = MAP_CONFIG.colors.gridLine;
    ctx.lineWidth = 1;
    for (let x = 0; x <= W; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y <= H; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    ctx.restore();
}

function _drawEdge(ctx, aName, bName, cost, style) {
    const p1 = MAP_CONFIG.nodes[aName];
    const p2 = MAP_CONFIG.nodes[bName];
    if (!p1 || !p2) return;

    ctx.save();

    // Stroke style per mode
    if (style === 'cyan') {
        ctx.strokeStyle = MAP_CONFIG.colors.cyan;
        ctx.lineWidth   = 4;
        ctx.shadowColor = MAP_CONFIG.colors.cyanGlow;
        ctx.shadowBlur  = 14;
        ctx.lineCap     = 'round';
    } else if (style === 'orange') {
        ctx.strokeStyle = MAP_CONFIG.colors.orange;
        ctx.lineWidth   = 4;
        ctx.shadowColor = MAP_CONFIG.colors.orangeGlow;
        ctx.shadowBlur  = 14;
        ctx.lineCap     = 'round';
    } else {
        ctx.strokeStyle = MAP_CONFIG.colors.baseEdge;
        ctx.lineWidth   = 1.3;
        ctx.setLineDash([4, 5]);
    }

    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
    ctx.restore();

    // Edge weight label (pill in the middle)
    if (cost !== undefined && cost !== '') {
        const mx = (p1.x + p2.x) / 2;
        const my = (p1.y + p2.y) / 2;

        ctx.save();
        ctx.font         = '11px "Roboto Mono", monospace';
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';

        // Accept either a pre-formatted string (e.g. "[1] 150 km") or a raw number
        const label = typeof cost === 'string' ? cost : `${cost} km`;
        const w = ctx.measureText(label).width + 10;

        // Background pill
        ctx.fillStyle = '#0a0a0a';
        ctx.strokeStyle =
            style === 'cyan'   ? MAP_CONFIG.colors.cyan   :
            style === 'orange' ? MAP_CONFIG.colors.orange :
                                 '#2a2a2a';
        ctx.lineWidth = 1;
        _roundedRect(ctx, mx - w / 2, my - 9, w, 18, 4);
        ctx.fill();
        ctx.stroke();

        // Label text
        ctx.fillStyle =
            style === 'cyan'   ? MAP_CONFIG.colors.cyan    :
            style === 'orange' ? MAP_CONFIG.colors.orange  :
                                 MAP_CONFIG.colors.baseLabel;
        ctx.fillText(label, mx, my);
        ctx.restore();
    }
}

function _roundedRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

function _drawNode(ctx, name, pos, isActive) {
    const pulse = 1 + Math.sin(mapState.pulsePhase) * 0.15;
    const ringColor =
        mapState.type === 'prim' && isActive
            ? MAP_CONFIG.colors.orange
            : MAP_CONFIG.colors.cyan;
    const glowColor =
        mapState.type === 'prim' && isActive
            ? MAP_CONFIG.colors.orangeGlow
            : MAP_CONFIG.colors.cyanGlow;

    // Outer ring
    ctx.save();
    ctx.shadowColor = glowColor;
    ctx.shadowBlur  = isActive ? 18 : 10;
    ctx.fillStyle   = MAP_CONFIG.colors.nodeFill;
    ctx.strokeStyle = isActive ? ringColor : '#666';
    ctx.lineWidth   = isActive ? 2.5 : 1.5;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Inner pulsing dot
    ctx.save();
    ctx.fillStyle = isActive ? ringColor : '#444';
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, (isActive ? 3.5 : 2.5) * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Label below the node
    ctx.save();
    ctx.font         = 'bold 11px "Orbitron", sans-serif';
    ctx.fillStyle    = isActive ? MAP_CONFIG.colors.nodeLabel : '#888';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(pos.label, pos.x, pos.y + 16);
    ctx.restore();
}

function _drawDrone(ctx) {
    const nodes = mapState.pathNodes;
    const segCount = nodes.length - 1;

    // Map overall droneT [0..1] → (segment index, local segment t)
    const totalT = mapState.droneT * segCount;
    const segIdx = Math.min(Math.floor(totalT), segCount - 1);
    const segT   = totalT - segIdx;

    const a = MAP_CONFIG.nodes[nodes[segIdx]];
    const b = MAP_CONFIG.nodes[nodes[segIdx + 1]];
    if (!a || !b) return;

    const x = a.x + (b.x - a.x) * segT;
    const y = a.y + (b.y - a.y) * segT;

    // Pulsing halo (radial gradient)
    const halo = 10 + Math.sin(mapState.pulsePhase * 3) * 3;
    ctx.save();
    const grad = ctx.createRadialGradient(x, y, 1, x, y, halo + 12);
    grad.addColorStop(0,   'rgba(0, 240, 255, 0.85)');
    grad.addColorStop(0.5, 'rgba(0, 240, 255, 0.25)');
    grad.addColorStop(1,   'rgba(0, 240, 255, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, halo + 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Core white dot with cyan glow
    ctx.save();
    ctx.fillStyle   = MAP_CONFIG.colors.droneCore;
    ctx.shadowColor = MAP_CONFIG.colors.cyan;
    ctx.shadowBlur  = 22;
    ctx.beginPath();
    ctx.arc(x, y, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Tiny rotor cross to suggest a drone silhouette
    ctx.save();
    ctx.strokeStyle = MAP_CONFIG.colors.cyan;
    ctx.lineWidth   = 1.2;
    ctx.beginPath();
    ctx.moveTo(x - 7, y); ctx.lineTo(x + 7, y);
    ctx.moveTo(x, y - 7); ctx.lineTo(x, y + 7);
    ctx.stroke();
    ctx.restore();
}

// ---------------------------------------------------------------------------
// PUBLIC API — Called by ui.js after algorithm results are displayed
// ---------------------------------------------------------------------------
/**
 * Redraws the canvas with new highlighted layers based on algorithm output.
 *
 * @param {string} type - One of 'dijkstra', 'prim', 'reset'
 * @param {Object} data - Payload shape depends on type:
 *     dijkstra → { route: string[], cost?: number }
 *     prim     → { edges:  [[from, to, cost], ...], total_cost?: number }
 *     reset    → (ignored)
 */
function updateMap(type, data = {}) {
    const statusEl = document.getElementById('map-status');

    // Always cancel any in-flight MST animation before switching modes
    mapState.mstTimeouts.forEach(id => clearTimeout(id));
    mapState.mstTimeouts = [];

    if (type === 'dijkstra') {
        const route = Array.isArray(data.route) ? data.route
                    : Array.isArray(data.path)  ? data.path
                    : [];
        mapState.type      = 'dijkstra';
        mapState.pathNodes = route.slice();
        mapState.mstEdges  = [];
        mapState.droneT    = 0;
        if (statusEl) {
            statusEl.className = 'map-status mode-dijkstra';
            statusEl.textContent = route.length > 1
                ? `DIJKSTRA ACTIVE — ${route.length - 1} hop${route.length - 1 === 1 ? '' : 's'}${data.cost ? ' · ' + data.cost + ' km' : ''}`
                : 'DIJKSTRA ACTIVE';
        }

    } else if (type === 'prim') {
        const edges = Array.isArray(data.edges) ? data.edges : [];

        mapState.type      = 'prim';
        mapState.mstEdges  = [];   // Start empty — edges appear one by one
        mapState.pathNodes = [];

        if (statusEl) {
            statusEl.className   = 'map-status mode-prim';
            statusEl.textContent = edges.length
                ? `PRIM'S MST — animating ${edges.length} link${edges.length === 1 ? '' : 's'}…`
                : "PRIM'S MST ACTIVE";
        }

        // Schedule each edge to materialise 800 ms after the previous one.
        // Each tuple stored as [from, to, cost, stepNumber] so the draw loop
        // can render the "[N] cost km" label without any extra lookup.
        edges.forEach(([from, to, cost], index) => {
            const step = index + 1;
            const id = setTimeout(() => {
                mapState.mstEdges.push([from, to, cost, step]);

                // Update the status bar once the final edge lands
                if (step === edges.length && statusEl) {
                    statusEl.textContent = `PRIM'S MST — ${edges.length} backbone link${edges.length === 1 ? '' : 's'}${data.total_cost ? ' · ' + data.total_cost + ' km' : ''}`;
                }
            }, index * 800);
            mapState.mstTimeouts.push(id);
        });

    } else if (type === 'reset') {
        mapState.type      = null;
        mapState.pathNodes = [];
        mapState.mstEdges  = [];
        if (statusEl) {
            statusEl.className   = 'map-status';
            statusEl.textContent = 'STANDBY — Run Dijkstra or Prim\'s to visualize';
        }
    }

    // Immediate redraw (the animation loop will continue refreshing after)
    drawMap();
}

// ---------------------------------------------------------------------------
// BOOTSTRAP — Start the map once the DOM is ready
// ---------------------------------------------------------------------------
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMap);
} else {
    initMap();
}
