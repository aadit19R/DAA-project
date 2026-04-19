/**
 * api.js — MetroGrid API Layer
 *
 * Contains ONLY async fetch() functions that communicate with the Flask backend.
 * No DOM manipulation occurs here. Returns raw parsed JSON to the caller.
 */

'use strict';

/**
 * POST /api/navigate
 * Sends source and destination hub names to the Dijkstra endpoint.
 * @param {string} source      - Name of the source hub.
 * @param {string} destination - Name of the destination hub.
 * @returns {Promise<Object>}  Parsed JSON response.
 */
async function fetchRouteData(source, destination) {
    const response = await fetch('/api/navigate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ source, destination }),
    });
    return response.json();
}

/**
 * GET /api/infrastructure
 * Triggers Prim's MST calculation on the backend.
 * @returns {Promise<Object>}  MST edges and total cost.
 */
async function fetchInfrastructureData() {
    const response = await fetch('/api/infrastructure');
    return response.json();
}

/**
 * GET /api/fleet/sort?key=battery&order=desc
 * Triggers Merge Sort in the LinkedList and returns the sorted fleet.
 * @param {string} key   - 'battery' or 'kilometers'
 * @param {string} order - 'desc' or 'asc'
 * @returns {Promise<Object>}  Sorted fleet array.
 */
async function fetchFleetSort(key = 'battery', order = 'desc') {
    const response = await fetch(`/api/fleet/sort?key=${key}&order=${order}`);
    return response.json();
}

/**
 * POST /api/fleet/reset
 * Reseeds the fleet registry with original messy order for a fresh demo.
 * @returns {Promise<Object>}  Reshuffled fleet array.
 */
async function postFleetReset() {
    const response = await fetch('/api/fleet/reset', { method: 'POST' });
    return response.json();
}

/**
 * GET /api/fleet
 * Fetches the current Linked List state as an array of drone IDs.
 * @returns {Promise<Object>}  Fleet array from server.
 */
async function fetchFleetData() {
    const response = await fetch('/api/fleet');
    return response.json();
}

/**
 * POST /api/fleet/register
 * Registers a new structured drone into the Linked List.
 * @param {string} id      - Drone identifier.
 * @param {number} battery - Battery percentage (0-100).
 * @param {number} kms     - Kilometers traveled.
 */
async function postRegisterDrone(id, battery, kms) {
    const response = await fetch('/api/fleet/register', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ id, battery, kms }),
    });
    return response.json();
}

/**
 * DELETE /api/fleet/remove/<drone_id>
 * Removes the drone from the Linked List and retrieves pointer log.
 * @param {string} droneId - ID of the drone to delete.
 */
async function deleteFleetDrone(droneId) {
    const response = await fetch(`/api/fleet/remove/${encodeURIComponent(droneId)}`, {
        method: 'DELETE',
    });
    return response.json();
}

/**
 * GET /api/logs
 * Reads all recent activities currently stored in the backend Circular Queue.
 * @returns {Promise<Object>}  Array of log strings.
 */
async function fetchLogData() {
    const response = await fetch('/api/logs');
    return response.json();
}
