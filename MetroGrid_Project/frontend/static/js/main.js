/**
 * main.js — MetroGrid Controller Layer
 *
 * Wires api.js (data) → ui.js (display) via event listeners.
 * Contains NO fetch logic and NO direct DOM writes beyond calling ui.js helpers.
 * Every API call is wrapped in try/catch for graceful error handling.
 *
 * Load order in index.html: api.js → ui.js → main.js
 */

'use strict';

document.addEventListener('DOMContentLoaded', () => {

    // -------------------------------------------------------------------------
    // FREIGHT NAVIGATOR — Dijkstra Algorithm
    // -------------------------------------------------------------------------
    document.getElementById('btn-navigate').addEventListener('click', async () => {
        const source      = document.getElementById('source-hub').value;
        const destination = document.getElementById('dest-hub').value;

        setTerminalLoading('nav-output', 'Computing optimal freight route...');

        try {
            const result = await fetchRouteData(source, destination);
            if (result.status === 'success') {
                displayRouteResult(
                    source,
                    destination,
                    result.data.route,
                    result.data.cost
                );
                refreshLogs();
            } else {
                setTerminalError('nav-output', result.message);
            }
        } catch (err) {
            setTerminalError('nav-output', `Server unreachable. (${err.message})`);
        }
    });


    // -------------------------------------------------------------------------
    // INFRASTRUCTURE OPTIMIZER — Prim's MST Algorithm
    // -------------------------------------------------------------------------
    document.getElementById('btn-infrastructure').addEventListener('click', async () => {
        setTerminalLoading('infra-output', 'Scanning MetroGrid topology for MST...');

        try {
            const result = await fetchInfrastructureData();
            if (result.status === 'success') {
                displayInfrastructureResult(
                    result.data.edges,
                    result.data.total_cost
                );
                refreshLogs();
            } else {
                setTerminalError('infra-output', result.message);
            }
        } catch (err) {
            setTerminalError('infra-output', `Server unreachable. (${err.message})`);
        }
    });


    // -------------------------------------------------------------------------
    // FLEET PERFORMANCE OPTIMIZER — Merge Sort
    // -------------------------------------------------------------------------
    document.getElementById('btn-sort-fleet').addEventListener('click', async () => {
        const sortKey = document.getElementById('sort-key').value;
        // battery sorts descending (high first); distance sorts ascending (low first)
        const order   = sortKey === 'battery' ? 'desc' : 'asc';

        setTerminalLoading('optimizer-output', '> Initiating Divide & Conquer Protocol...');

        try {
            const result = await fetchFleetSort(sortKey, order);
            if (result.status === 'success') {
                displayFleetSortResult(result.data, sortKey, order);
                // Also refresh the fleet registry panel to reflect the new order
                renderFleetList('fleet-list', result.data, 'Registry is empty.');
                refreshLogs();
            } else {
                setTerminalError('optimizer-output', result.message);
            }
        } catch (err) {
            setTerminalError('optimizer-output', `Server unreachable. (${err.message})`);
        }
    });

    document.getElementById('btn-randomize-fleet').addEventListener('click', async () => {
        setTerminalLoading('optimizer-output', '> Reshuffling fleet registry to original order...');
        try {
            const result = await postFleetReset();
            if (result.status === 'success') {
                setTerminalLoading('optimizer-output',
                    '> Fleet registry randomized. Run OPTIMIZE to sort.');
                renderFleetList('fleet-list', result.data, 'Registry is empty.');
            } else {
                setTerminalError('optimizer-output', result.message);
            }
        } catch (err) {
            setTerminalError('optimizer-output', `Server unreachable. (${err.message})`);
        }
    });


    // -------------------------------------------------------------------------
    // FLEET REGISTRY — Linked List (Register / Delete / Sort)
    // -------------------------------------------------------------------------
    const refreshFleet = async () => {
        renderFleetList('fleet-list', [], 'Loading fleet registry...');
        try {
            const result = await fetchFleetData();
            renderFleetList('fleet-list', result.data, 'Registry is empty.');
        } catch (err) {
            console.error('Fleet fetch error:', err);
        }
    };

    // Refresh button
    document.getElementById('btn-refresh-fleet').addEventListener('click', refreshFleet);

    // 3-field registration form
    document.getElementById('btn-add-drone').addEventListener('click', async () => {
        const idInput  = document.getElementById('new-drone-id');
        const batInput = document.getElementById('new-drone-battery');
        const kmInput  = document.getElementById('new-drone-kms');

        const droneId = idInput.value.trim();
        const battery = parseInt(batInput.value, 10);
        const kms     = parseInt(kmInput.value,  10);

        if (!droneId) { setTerminalLoading('fleet-output', '> ERROR: Drone ID is required.'); return; }
        if (isNaN(battery) || battery < 0 || battery > 100) {
            setTerminalLoading('fleet-output', '> ERROR: Battery must be 0-100.'); return;
        }
        if (isNaN(kms) || kms < 0) {
            setTerminalLoading('fleet-output', '> ERROR: Km must be a non-negative integer.'); return;
        }

        try {
            const result = await postRegisterDrone(droneId, battery, kms);
            if (result.status === 'success') {
                idInput.value = batInput.value = kmInput.value = '';
                setTerminalLoading('fleet-output',
                    `> Node [${droneId}] appended to tail of Linked List.\n` +
                    `> tail.next → [${droneId}]. Pointers updated.`);
                renderFleetList('fleet-list', result.data, 'Registry is empty.');
                refreshLogs();
            } else {
                setTerminalError('fleet-output', result.message);
            }
        } catch (err) {
            setTerminalError('fleet-output', `Server unreachable. (${err.message})`);
        }
    });

    // Delete buttons — event delegation on the fleet list
    document.getElementById('fleet-list').addEventListener('click', async (e) => {
        const btn = e.target.closest('.delete-drone-btn');
        if (!btn) return;

        const droneId = btn.dataset.droneId;
        setTerminalLoading('fleet-output', `> Locating Node [${droneId}] in Linked List...`);

        try {
            const result = await deleteFleetDrone(droneId);
            if (result.status === 'success') {
                typeWriterEffect('fleet-output', result.log, 12);
                renderFleetList('fleet-list', result.data, 'Registry is empty.');
                refreshLogs();
            } else {
                setTerminalError('fleet-output', result.message);
            }
        } catch (err) {
            setTerminalError('fleet-output', `Server unreachable. (${err.message})`);
        }
    });




    // -------------------------------------------------------------------------
    // SYSTEM MONITOR — Circular Queue (Live Activity Logger)
    // -------------------------------------------------------------------------
    const refreshLogs = async () => {
        try {
            const result = await fetchLogData();
            displaySystemLogs(result.data);
        } catch (err) {
            console.error('Log fetch error:', err);
        }
    };


    // -------------------------------------------------------------------------
    // INIT — Populate live panels on first page load
    // -------------------------------------------------------------------------
    refreshFleet();
    refreshLogs();

});
