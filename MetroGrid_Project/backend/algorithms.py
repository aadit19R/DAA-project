"""
algorithms.py — MetroGrid Core Algorithm Implementations

Imports data structures from data_structures.py and static data from config.py.
All three algorithms are manually implemented with no external libraries.

Constraints:
  - No heapq, no sorted(), no built-in algorithm modules.
  - Dijkstra and Prim's use O(V^2) manual linear scans over arrays.
"""

from data_structures import Stack, Queue
from config import hub_names, adj_matrix, get_hub_index, BLOCKED


# ---------------------------------------------------------------------------
# ALGORITHM 1: Dijkstra's Shortest Path — Freight Navigation
# ---------------------------------------------------------------------------

def _find_min_dist_node(dist, visited):
    """
    Internal helper: manual O(V) linear scan over dist[] to find the
    unvisited node with the smallest tentative distance.
    Justification: Replaces a Min-Heap to satisfy the no-tree constraint.

    Args:
        dist    (list[float]): Current shortest distance to each hub.
        visited (list[bool]):  True for hubs already finalised.

    Returns:
        int: Index of the minimum-distance unvisited node, or -1 if none.
    """
    min_dist  = float('inf')
    min_index = -1
    for v in range(len(hub_names)):
        if not visited[v] and dist[v] < min_dist:
            min_dist  = dist[v]
            min_index = v
    return min_index


def calculate_freight_route(source, destination):
    """
    Dijkstra's Algorithm — Find the minimum-cost freight route between hubs.
    Time Complexity: O(V^2) — V outer iterations × O(V) linear min-scan.
    Uses the Stack class to reverse the predecessor array into a forward path.

    Args:
        source      (str): Name of the starting city hub.
        destination (str): Name of the destination city hub.

    Returns:
        tuple:
          - route_log  (list[str]): Ordered hub names from source to destination.
          - total_cost (int):       Total transit distance in km.
          On error: (error_message: str, -1)
    """
    start_idx = get_hub_index(source)
    end_idx   = get_hub_index(destination)

    if start_idx == -1 or end_idx == -1:
        return "Invalid hub name provided.", -1

    num_nodes = len(hub_names)
    dist      = [float('inf')] * num_nodes  # dist[v] = shortest known dist to v
    visited   = [False]        * num_nodes  # visited[v] = True once finalised
    pred      = [-1]           * num_nodes  # pred[v] = predecessor of v in path

    dist[start_idx] = 0

    # --- O(V^2) Dijkstra Main Loop ---
    for _ in range(num_nodes):
        u = _find_min_dist_node(dist, visited)  # O(V) linear scan, no heap
        if u == -1:
            break  # All remaining nodes are unreachable

        visited[u] = True

        for v in range(num_nodes):
            edge_weight = adj_matrix[u][v]
            # Skip: self-loop (0), or blocked route (BLOCKED).
            # Only relax if this path to v is shorter than the current best.
            if not visited[v] and edge_weight != 0 and edge_weight != BLOCKED:
                if dist[u] + edge_weight < dist[v]:
                    dist[v] = dist[u] + edge_weight
                    pred[v] = u

    if dist[end_idx] == float('inf'):
        return "No path exists between selected hubs.", -1

    # --- Stack-based path reconstruction ---
    # Push nodes from destination back to source using pred[], then pop to reverse.
    route_stack = Stack()
    node = end_idx
    while node != -1:
        route_stack.push(hub_names[node])
        node = pred[node]

    route_log = []
    while not route_stack.is_empty():
        route_log.append(route_stack.pop())

    return route_log, dist[end_idx]


# ---------------------------------------------------------------------------
# ALGORITHM 2: Prim's MST — Infrastructure Optimization
# ---------------------------------------------------------------------------

def optimize_infrastructure():
    """
    Prim's Algorithm — Find the Minimum Spanning Tree for the rail network.
    Connects all city hubs with the lowest total infrastructure cost.
    Time Complexity: O(V^2) — outer while-loop runs V-1 times, inner nested
    for-loops perform an O(V^2) scan to find the minimum cut edge.
    Justification: Manual nested loops replace a priority queue.

    Returns:
        tuple:
          - mst_edges  (list[tuple]): [(from_hub, to_hub, cost), ...] for each rail link.
          - total_cost (int):         Sum of all MST edge weights.
    """
    num_nodes  = len(hub_names)
    visited    = [False] * num_nodes  # visited[i] = True when hub i is in the MST
    mst_edges  = []
    total_cost = 0

    visited[0]   = True   # Grow MST from Mumbai Central (index 0)
    edges_added  = 0

    # We need exactly V-1 edges to span all V nodes
    while edges_added < num_nodes - 1:
        min_weight = float('inf')
        u_node = -1
        v_node = -1

        # --- O(V^2) cut scan: minimum edge from visited -> unvisited set ---
        for i in range(num_nodes):
            if visited[i]:
                for j in range(num_nodes):
                    edge_weight = adj_matrix[i][j]
                    # Skip: self-loop (0), or blocked route (BLOCKED).
                    if not visited[j] and edge_weight != 0 and edge_weight != BLOCKED:
                        if edge_weight < min_weight:
                            min_weight = edge_weight
                            u_node     = i
                            v_node     = j

        if u_node != -1 and v_node != -1:
            visited[v_node] = True
            # Edges are appended in the exact order Prim's selects them,
            # so mst_edges[0] is step 1, mst_edges[1] is step 2, etc.
            # The frontend relies on this chronological ordering for animation.
            mst_edges.append((hub_names[u_node], hub_names[v_node], min_weight))
            total_cost  += min_weight
            edges_added += 1

    return mst_edges, total_cost

