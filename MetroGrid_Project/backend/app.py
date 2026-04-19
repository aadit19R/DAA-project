"""
app.py — MetroGrid Flask Application Entry Point

Responsibilities (ONLY):
  - Initialize the Flask app with cross-directory template/static paths.
  - Instantiate global in-memory Data Structure objects.
  - Define thin API route handlers that delegate to algorithms.py.
  - Seed initial data and start the dev server.

No algorithm logic lives here. Routes parse → call → return JSON.
"""

from flask import Flask, request, jsonify, render_template

from algorithms import (
    calculate_freight_route,
    optimize_infrastructure,
)
from data_structures import CircularQueue, LinkedList

# ---------------------------------------------------------------------------
# Flask App Initialization
# template_folder and static_folder paths are relative to this file's location
# (backend/), so we step up one level with '../' to reach the frontend/.
# ---------------------------------------------------------------------------
app = Flask(
    __name__,
    template_folder='../frontend/templates',
    static_folder='../frontend/static',
)

# Hardcoded seed fleet — intentionally 'messy' battery order for demo.
# Each record: { id, battery (%), kilometers (km) }
SEED_FLEET = [
    {"id": "Drone-Alpha",   "battery": 12,  "kilometers": 340},
    {"id": "Drone-Bravo",   "battery": 95,  "kilometers": 80 },
    {"id": "Drone-Charlie", "battery": 45,  "kilometers": 210},
    {"id": "Drone-Delta",   "battery": 60,  "kilometers": 155},
    {"id": "Drone-Echo",    "battery": 5,   "kilometers": 490},
    {"id": "Drone-Foxtrot", "battery": 78,  "kilometers": 120},
]

# ---------------------------------------------------------------------------
# Global In-Memory State
# These objects persist for the lifetime of the Flask process.
# ---------------------------------------------------------------------------
activity_log   = CircularQueue(capacity=5)
fleet_registry = LinkedList()


# ---------------------------------------------------------------------------
# FLASK API ROUTES
# Each route is a thin controller: parse → call algorithm → return JSON.
# ---------------------------------------------------------------------------

@app.route('/')
def home():
    """Serve the main MetroGrid dashboard."""
    return render_template('index.html')


@app.route('/api/navigate', methods=['POST'])
def api_navigate():
    """
    POST /api/navigate
    Body: { "source": "Hub Name", "destination": "Hub Name" }
    Delegates to calculate_freight_route() and returns the path + cost.
    """
    body        = request.get_json() or {}
    source      = body.get('source', '').strip()
    destination = body.get('destination', '').strip()

    if not source or not destination:
        return jsonify({"status": "error", "message": "Missing source or destination."}), 400

    route_log, total_cost = calculate_freight_route(source, destination)

    if total_cost == -1:
        return jsonify({"status": "error", "message": route_log}), 400

    activity_log.enqueue(f"Path found to {destination}")

    return jsonify({
        "status": "success",
        "data": {"route": route_log, "cost": total_cost},
    })


@app.route('/api/infrastructure', methods=['GET'])
def api_infrastructure():
    """
    GET /api/infrastructure
    Delegates to optimize_infrastructure() and returns MST edges + cost.
    """
    mst_edges, total_cost = optimize_infrastructure()
    activity_log.enqueue("Infrastructure optimized")
    return jsonify({
        "status": "success",
        "data": {"edges": mst_edges, "total_cost": total_cost},
    })


@app.route('/api/fleet/sort', methods=['GET'])
def api_fleet_sort():
    """
    GET /api/fleet/sort?criteria=battery   (or ?key=battery&order=desc)
    Runs Merge Sort (fast/slow pointer) on the LinkedList in-place.
    Returns the newly ordered fleet.
    """
    # Accept both ?criteria= (new) and ?key= (optimizer panel) params
    key   = request.args.get('criteria') or request.args.get('key',   'battery')
    order = request.args.get('order', 'desc')

    # When sorting by kilometers, default to ascending
    if key == 'kilometers' and 'order' not in request.args:
        order = 'asc'

    if key not in ('battery', 'kilometers'):
        return jsonify({"status": "error", "message": "criteria must be battery or kilometers."}), 400

    reverse = (order == 'desc')
    fleet_registry.merge_sort(key=key, reverse=reverse)
    activity_log.enqueue(f"Fleet sorted by {key}")

    return jsonify({
        "status": "success",
        "data":   fleet_registry.get_active_fleet(),
    })


@app.route('/api/fleet/register', methods=['POST'])
def api_fleet_register():
    """
    POST /api/fleet/register
    Body: { "id": "Drone-XYZ", "battery": 80, "kms": 120 }
    Registers a new fully-structured drone into the Linked List.
    """
    body    = request.get_json() or {}
    drone_id = body.get('id', '').strip()
    battery  = body.get('battery', 100)
    kms      = body.get('kms', 0)

    if not drone_id:
        return jsonify({"status": "error", "message": "Missing drone id."}), 400

    try:
        battery = int(battery)
        kms     = int(kms)
    except (ValueError, TypeError):
        return jsonify({"status": "error", "message": "battery and kms must be integers."}), 400

    fleet_registry.register_drone({"id": drone_id, "battery": battery, "kilometers": kms})
    activity_log.enqueue(f"Drone [{drone_id}] registered")
    
    return jsonify({
        "status":  "success",
        "message": f"Drone '{drone_id}' registered.",
        "data":    fleet_registry.get_active_fleet(),
    })


@app.route('/api/fleet/remove/<drone_id>', methods=['DELETE'])
def api_fleet_remove(drone_id):
    """
    DELETE /api/fleet/remove/<drone_id>
    Calls delete_node() and returns the pointer manipulation log.
    """
    success, log = fleet_registry.delete_node(drone_id)
    if not success:
        return jsonify({"status": "error",   "message": log}), 404
        
    activity_log.enqueue(f"Drone [{drone_id}] removed")
    return jsonify({
        "status":  "success",
        "log":     log,
        "data":    fleet_registry.get_active_fleet(),
    })


@app.route('/api/fleet/reset', methods=['POST'])
def api_fleet_reset():
    """
    POST /api/fleet/reset
    Rebuilds the fleet registry from SEED_FLEET in the original messy order.
    """
    fleet_registry.clear()
    for drone in SEED_FLEET:
        fleet_registry.register_drone(drone)
    return jsonify({
        "status":  "success",
        "message": "Fleet registry reshuffled.",
        "data":    fleet_registry.get_active_fleet(),
    })


@app.route('/api/fleet', methods=['GET'])
def api_fleet():
    """
    GET /api/fleet
    Returns the current Linked List state as an array of drone records.
    """
    fleet = fleet_registry.get_active_fleet()
    return jsonify({"status": "success", "data": fleet})


@app.route('/api/logs', methods=['GET'])
def api_logs():
    """
    GET /api/logs
    Returns all recent actions currently stored in the Circular Queue ring buffer.
    """
    alerts = activity_log.get_all()
    return jsonify({"status": "success", "data": alerts})


# ---------------------------------------------------------------------------
# ENTRYPOINT — Seed in-memory data and start the Flask dev server
# ---------------------------------------------------------------------------
if __name__ == '__main__':
    # Seed fleet registry with messy-order drones for immediate demo
    for drone in SEED_FLEET:
        fleet_registry.register_drone(drone)

    # Seed log ring with initial system logs
    activity_log.enqueue("System initialized")
    activity_log.enqueue("Network topology loaded")
    activity_log.enqueue("Standing fleet active")

    print("=" * 55)
    print("  METROGRID Command Center — Flask API Initialized")
    print("=" * 55)
    print("  Serving at:  http://127.0.0.1:5001")
    print("  Endpoints:   /api/navigate  /api/infrastructure")
    print("               /api/fleet(/sort|/reset)  /api/logs")
    print("=" * 55)

    app.run(debug=True, port=5001)
