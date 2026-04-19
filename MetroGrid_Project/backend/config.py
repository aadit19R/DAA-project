"""
config.py — MetroGrid Static Data Configuration

Contains the 1D hub_names array, the sparse 5x5 Adjacency Matrix,
and the get_hub_index() Linear Search mapping function.

Sparse Graph Design (Triangle Inequality / Bottleneck Demonstration):
  Only short-range regional hops are connected. Long-distance direct routes
  are intentionally blocked at BLOCKED (9999), forcing Dijkstra to compute
  multi-hop optimal paths through intermediate hubs.

  Active edges:
    Mumbai  <-> Pune       (150 km)  — Regional corridor
    Pune    <-> Hyderabad  (600 km)  — Central artery
    Pune    <-> Bangalore  (840 km)  — Deccan connector
    Hyderabad <-> Bangalore(570 km)  — Southern link
    Hyderabad <-> Delhi    (1100 km) — Northern trunk

  Forced multi-hop paths (key examples):
    Mumbai  -> Delhi     : 0->1->3->4   = 1850 km  (3 hops)
    Mumbai  -> Bangalore : 0->1->2      =  990 km  (2 hops)
    Bangalore -> Delhi   : 2->3->4      = 1670 km  (2 hops)
    Pune    -> Delhi     : 1->3->4      = 1700 km  (2 hops)

Constraint: get_hub_index uses a manual for-loop — NO hash tables or dicts.
"""

# ---------------------------------------------------------------------------
# 1D Array: City Hub Names
# Index position maps directly to the row/column in adj_matrix.
# ---------------------------------------------------------------------------
hub_names = [
    "Mumbai Central",   # Index 0
    "Pune Outpost",     # Index 1
    "Bangalore Apex",   # Index 2
    "Hyderabad Core",   # Index 3
    "Delhi Hub",        # Index 4
]

# Sentinel value representing a blocked / non-existent direct route.
# Used instead of float('inf') so the value is printable and storable as JSON.
BLOCKED = 9999

# ---------------------------------------------------------------------------
# 5x5 Adjacency Matrix — Sparse Undirected Graph
# Cell [i][j] = transit distance in km. 0 = self-loop (diagonal).
# BLOCKED = no direct road/rail between those two hubs.
#
# Topology (only active edges):
#
#   Mumbai(0) ---150--- Pune(1) ---600--- Hyderabad(3) ---1100--- Delhi(4)
#                         |                    |
#                        840                  570
#                         |                    |
#                      Bangalore(2) ----------+
# ---------------------------------------------------------------------------
adj_matrix = [
    #   Mumb     Pune     Bang     Hyde    Delhi
    [      0,     150,  BLOCKED, BLOCKED, BLOCKED],  # Mumbai Central  (0)
    [    150,       0,      840,     600,  BLOCKED],  # Pune Outpost    (1)
    [BLOCKED,     840,        0,     570,  BLOCKED],  # Bangalore Apex  (2)
    [BLOCKED,     600,      570,       0,     1100],  # Hyderabad Core  (3)
    [BLOCKED, BLOCKED,  BLOCKED,    1100,        0],  # Delhi Hub       (4)
]


def get_hub_index(name):
    """
    Linear Search over hub_names[] to find the integer index for a hub name.
    Time Complexity: O(V) — strictly no hash tables or dictionaries.

    Args:
        name (str): The hub name to search for.

    Returns:
        int: Index (0-4) if found, -1 if not found.
    """
    for i in range(len(hub_names)):
        if hub_names[i] == name:
            return i
    return -1
