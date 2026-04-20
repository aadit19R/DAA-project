/**
 * ui.js — MetroGrid UI Layer
 *
 * Contains ONLY DOM manipulation and display functions.
 * No fetch() calls occur here. Receives data as arguments and writes to DOM.
 */

'use strict';

// ---------------------------------------------------------------------------
// UTILITY FUNCTIONS
// ---------------------------------------------------------------------------

/**
 * Animates text into a terminal-style output element, character by character.
 * @param {string} elementId - ID of the target <div> element.
 * @param {string} text      - Full string to animate.
 * @param {number} speed     - Delay in ms between each character (default 13).
 */
function typeWriterEffect(elementId, text, speed = 13) {
    const el = document.getElementById(elementId);
    el.innerHTML = '';
    let i = 0;

    function tick() {
        if (i < text.length) {
            el.innerHTML += text.charAt(i) === '\n' ? '<br>' : text.charAt(i);
            i++;
            setTimeout(tick, speed);
        }
    }
    tick();
}

/**
 * Writes a loading/status message directly into a terminal output element.
 * @param {string} elementId - Target output element ID.
 * @param {string} message   - Status text to display.
 */
function setTerminalLoading(elementId, message) {
    document.getElementById(elementId).innerText = message;
}

/**
 * Writes a formatted error into a terminal output element.
 * @param {string} elementId - Target output element ID.
 * @param {string} message   - Error detail to display.
 */
function setTerminalError(elementId, message) {
    document.getElementById(elementId).innerText = `> ERROR: ${message}`;
}

/**
 * Populates a <ul> element with an array of strings as <li> items.
 * @param {string}   listId       - ID of the target <ul> element.
 * @param {string[]} items        - Strings to render as list items.
 * @param {string}   emptyMessage - Fallback text when items is empty.
 */
function renderList(listId, items, emptyMessage = 'No data available.') {
    const ul = document.getElementById(listId);
    ul.innerHTML = '';
    if (!items || items.length === 0) {
        ul.innerHTML = `<li>${emptyMessage}</li>`;
        return;
    }
    items.forEach(text => {
        if (text) {
            const li = document.createElement('li');
            li.innerText = text;
            ul.appendChild(li);
        }
    });
}


// ---------------------------------------------------------------------------
// DISPLAY FUNCTIONS — one per algorithm panel
// ---------------------------------------------------------------------------

/**
 * Formats and animates Dijkstra route result into the navigation terminal.
 * @param {string}   source      - Source hub name.
 * @param {string}   destination - Destination hub name.
 * @param {string[]} route       - Ordered hub names forming the delivery path.
 * @param {number}   cost        - Total transit cost in km.
 */
function displayRouteResult(source, destination, route, cost) {
    const routeStr = route.join(' -> ');
    const text = (
        `> ROUTE CALCULATED\n` +
        `> Source      : ${source}\n` +
        `> Destination : ${destination}\n` +
        `> Transit Cost: ${cost} km\n` +
        `> Optimal Path:\n` +
        `  ${routeStr}`
    );
    typeWriterEffect('nav-output', text, 12);

    // --- Visual map sync: highlight Dijkstra path + launch drone animation ---
    if (typeof updateMap === 'function') {
        updateMap('dijkstra', { route, cost });
    }
}

/**
 * Private helper: recursively walks the MST children map and builds an array
 * of indented ASCII tree lines using box-drawing characters.
 *
 * @param {string}   node        - Current hub being rendered.
 * @param {Object}   childrenMap - { hubName: [{child, cost}, ...] }
 * @param {string}   prefix      - Accumulated indent prefix for this depth level.
 * @returns {string[]}           - Array of formatted line strings.
 */
function _buildMstTreeLines(node, childrenMap, prefix) {
    const lines    = [];
    const children = childrenMap[node] || [];

    children.forEach(({ child, cost }, index) => {
        const isLast      = index === children.length - 1;
        const connector   = isLast ? '└── ' : '├── ';
        const extension   = isLast ? '    '   : '│   ';

        // Dot-pad the hub name so costs align neatly in the terminal column
        const label   = `${child} `;
        const dots    = '.'.repeat(Math.max(1, 36 - prefix.length - label.length));
        lines.push(`${prefix}${connector}${label}${dots} ${cost} km`);

        // Recurse into this child's subtree with updated prefix
        const childLines = _buildMstTreeLines(child, childrenMap, prefix + extension);
        childLines.forEach(l => lines.push(l));
    });

    return lines;
}

/**
 * Formats and animates Prim's MST result into the infrastructure terminal
 * as a hierarchical ASCII tree, showing the physical branching of the rail
 * network rather than a flat edge list.
 *
 * Algorithm:
 *   1. Build a childrenMap: { parentHub: [{child, cost}, ...] }
 *   2. Detect root = the hub that appears as 'from' but never as 'to'.
 *   3. Recursively render with ├──/└── connectors and │ vertical bars.
 *
 * @param {Array[]} edges     - Array of [from, to, cost] tuples from Prim's.
 * @param {number}  totalCost - Total MST infrastructure cost in km.
 */
function displayInfrastructureResult(edges, totalCost) {
    // --- Step 1: Build the parent → children adjacency for the MST tree ---
    const childrenMap = {};
    const childSet    = new Set();

    edges.forEach(([from, to, cost]) => {
        if (!childrenMap[from]) childrenMap[from] = [];
        childrenMap[from].push({ child: to, cost });
        childSet.add(to);
    });

    // --- Step 2: Root = node that appears as 'from' but never as 'to' ---
    const allFromNodes = edges.map(e => e[0]);
    const root = allFromNodes.find(node => !childSet.has(node)) || allFromNodes[0];

    // --- Step 3: Build header lines ---
    const lines = [
        `> MST ESTABLISHED — METROGRID RAIL NETWORK`,
        `> Total Infrastructure Cost : ${totalCost} km`,
        `> Rail Links Laid           : ${edges.length} (spanning ${edges.length + 1} hubs)`,
        `>`,
        `>  📍 ${root}  [NETWORK ROOT]`,
    ];

    // --- Step 4: Recursively append tree lines with '> ' prefix ---
    const treeLines = _buildMstTreeLines(root, childrenMap, '  ');
    treeLines.forEach(l => lines.push(`> ${l}`));

    typeWriterEffect('infra-output', lines.join('\n'), 8);

    // --- Visual map sync: highlight MST backbone in bright orange ---
    if (typeof updateMap === 'function') {
        updateMap('prim', { edges, total_cost: totalCost });
    }
}

/**
 * Renders the Fleet Performance Optimizer result.
 * Shows a cinematic typewriter log, then the sorted fleet in a formatted table.
 * @param {Object[]} fleet  - Sorted array of drone records.
 * @param {string}   key    - Sort key used ('battery' or 'kilometers').
 * @param {string}   order  - Sort order ('desc' or 'asc').
 */
function displayFleetSortResult(fleet, key, order) {
    const direction = order === 'desc' ? 'Descending ▼' : 'Ascending ▲';
    const keyLabel  = key === 'battery' ? 'Battery %' : 'Kilometers';

    let text = `> Initializing Divide & Conquer Protocol...\n`;
    text    += `> Splitting Linked List via Fast/Slow Pointer...\n`;
    text    += `> Recursively halving sub-lists until N=1 base cases...\n`;
    text    += `> Merging nodes based on [ ${keyLabel} ] ${direction}...\n`;
    text    += `> Success. Fleet optimized in O(N log N).\n`;
    text    += `> ${"-".repeat(46)}\n`;
    text    += `>  RANK  ID               ${keyLabel.padEnd(12)} \n`;
    text    += `> ${"-".repeat(46)}\n`;

    fleet.forEach((drone, idx) => {
        if (typeof drone !== 'object') return;
        const rank  = String(idx + 1).padStart(2);
        const id    = (drone.id || '').padEnd(16).slice(0, 16);
        const val   = key === 'battery'
            ? `${drone.battery}%`
            : `${drone.kilometers} km`;
        const bar   = key === 'battery'
            ? '█'.repeat(Math.round(drone.battery / 10)) + '░'.repeat(10 - Math.round(drone.battery / 10))
            : '';
        text += `>  #${rank}  ${id}  ${val.padEnd(8)}  ${bar}\n`;
    });

    typeWriterEffect('optimizer-output', text, 9);
}

/**
 * Renders the fleet registry list with structured drone rows.
 * Each row shows ID, battery bar, battery %, km, and a delete button.
 * Uses data-drone-id attribute on the delete button — main.js handles the click.
 * @param {string}   listId   - Target <ul> element ID.
 * @param {Array}    items    - Fleet data (strings or dicts).
 * @param {string}   emptyMsg - Fallback text when empty.
 */
function renderFleetList(listId, items, emptyMsg = 'Registry is empty.') {
    const ul = document.getElementById(listId);
    ul.innerHTML = '';
    if (!items || items.length === 0) {
        ul.innerHTML = `<li>${emptyMsg}</li>`;
        return;
    }
    items.forEach(item => {
        const li = document.createElement('li');
        li.style.cssText = 'display:flex; align-items:center; justify-content:space-between; gap:0.5rem;';

        if (typeof item === 'object' && item !== null) {
            const batt   = item.battery  ?? 0;
            const km     = item.kilometers ?? item.distance ?? 0;
            const filled = Math.min(Math.round(batt / 10), 10);
            const bar    = '█'.repeat(filled) + '░'.repeat(10 - filled);
            const color  = batt >= 60 ? 'var(--accent-cyan)' : batt >= 25 ? '#f0b429' : '#e53e3e';

            li.innerHTML =
                `<span style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                    <strong>${item.id}</strong>
                </span>` +
                `<span style="color:${color}; font-family:var(--font-mono); font-size:0.8rem; white-space:nowrap;">
                    ${bar} ${batt}%
                </span>` +
                `<span style="opacity:.55; font-size:0.8rem; white-space:nowrap; min-width:4rem; text-align:right;">
                    ${km} km
                </span>` +
                `<button
                    class="delete-drone-btn"
                    data-drone-id="${item.id}"
                    title="Remove ${item.id}"
                    style="background:none; border:1px solid #553; color:#e53e3e; border-radius:4px;
                           padding:0.1rem 0.4rem; cursor:pointer; font-size:0.75rem; flex-shrink:0;"
                >✕</button>`;
        } else {
            li.innerText = String(item);
        }
        ul.appendChild(li);
    });
}

/**
 * Displays the system activity logs in the monitor terminal.
 * @param {string[]} logs - Array of up to 5 log messages.
 */
function displaySystemLogs(logs) {
    const container = document.getElementById('log-output');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!logs || logs.length === 0) {
        container.innerHTML = '<div>System monitor initialized.</div>';
        return;
    }
    
    logs.forEach(log => {
        const div = document.createElement('div');
        div.style.marginBottom = '0.4rem';
        // Simple slide-in effect
        div.style.animation = 'fadeIn 0.3s ease-in-out';
        div.innerText = `> ${log}`;
        container.appendChild(div);
    });
    
    // Auto scroll to bottom in case it exceeds
    container.scrollTop = container.scrollHeight;
}
