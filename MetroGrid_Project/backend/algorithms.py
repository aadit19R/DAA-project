"""
algorithms.py — Dijkstra and Prim's implementations for MetroGrid.
No heapq, no sorted(), no built-in algorithm modules — O(V^2) manual scans throughout.
"""

from data_structures import Stack, Queue
from config import hub_names, adj_matrix, get_hub_index, BLOCKED


# ---------------------------------------------------------------------------
# ALGORITHM 1: Dijkstra's Shortest Path — Freight Navigation
# ---------------------------------------------------------------------------

def _find_min_dist_node(dist, visited):
    """
    O(V) linear scan to find the unvisited hub with the smallest tentative
    distance. Replaces a Min-Heap to satisfy the no-built-in-DS constraint.
    Returns the index, or -1 if all remaining nodes are unreachable.
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
    Dijkstra's shortest path — O(V^2) via manual linear scan (no heap).
    Uses a Stack to reverse the pred[] chain into a forward-order route.

    Returns: (route_log: list[str], total_cost: int)
             or (error_message: str, -1) on failure.
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

    for _ in range(num_nodes):
        u = _find_min_dist_node(dist, visited)
        if u == -1:
            break

        visited[u] = True

        for v in range(num_nodes):
            edge_weight = adj_matrix[u][v]
            # Skip self-loops and blocked routes; relax if a shorter path is found.
            if not visited[v] and edge_weight != 0 and edge_weight != BLOCKED:
                if dist[u] + edge_weight < dist[v]:
                    dist[v] = dist[u] + edge_weight
                    pred[v] = u

    if dist[end_idx] == float('inf'):
        return "No path exists between selected hubs.", -1

    # Walk pred[] backwards from destination → source, push to Stack, then pop to reverse.
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
    Prim's MST — O(V^2) nested scan, no priority queue.
    Grows the tree one minimum cut-edge at a time from Mumbai Central (index 0).
    Edges are appended in chronological selection order (relied on by the frontend animation).

    Returns: (mst_edges: list[tuple(from, to, cost)], total_cost: int)
    """
    num_nodes  = len(hub_names)
    visited    = [False] * num_nodes
    mst_edges  = []
    total_cost = 0

    visited[0]  = True  # seed from Mumbai Central
    edges_added = 0

    while edges_added < num_nodes - 1:
        min_weight = float('inf')
        u_node = -1
        v_node = -1

        # O(V^2) scan: find the cheapest edge crossing visited → unvisited.
        for i in range(num_nodes):
            if visited[i]:
                for j in range(num_nodes):
                    edge_weight = adj_matrix[i][j]
                    # Skip self-loops and blocked routes.
                    if not visited[j] and edge_weight != 0 and edge_weight != BLOCKED:
                        if edge_weight < min_weight:
                            min_weight = edge_weight
                            u_node     = i
                            v_node     = j

        if u_node != -1 and v_node != -1:
            visited[v_node] = True
            # Appended in selection order — frontend animation depends on this.
            mst_edges.append((hub_names[u_node], hub_names[v_node], min_weight))
            total_cost  += min_weight
            edges_added += 1

    return mst_edges, total_cost
