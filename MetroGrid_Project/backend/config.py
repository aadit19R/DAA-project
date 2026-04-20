"""
config.py — MetroGrid Static Data Configuration

Hub names, 5x5 adjacency matrix, and get_hub_index() lookup.
Long-distance direct routes are blocked (BLOCKED=9999) to force
Dijkstra through meaningful multi-hop paths.
"""

# Hub names — index maps directly to adj_matrix row/column.
hub_names = [
    "Mumbai Central",   # Index 0
    "Pune Outpost",     # Index 1
    "Bangalore Apex",   # Index 2
    "Hyderabad Core",   # Index 3
    "Delhi Hub",        # Index 4
]

# Sentinel for a blocked route — printable and JSON-safe.
BLOCKED = 9999

# 5x5 adjacency matrix. Cell [i][j] = km; 0 = self; BLOCKED = no direct link.
#
#   Mumbai(0) --150-- Pune(1) --600-- Hyderabad(3) --1100-- Delhi(4)
#                       |                  |
#                      840                570
#                       └── Bangalore(2) ─┘
adj_matrix = [
    #   Mumb     Pune     Bang     Hyde    Delhi
    [      0,     150,  BLOCKED, BLOCKED, BLOCKED],  # Mumbai Central  (0)
    [    150,       0,      840,     600,  BLOCKED],  # Pune Outpost    (1)
    [BLOCKED,     840,        0,     570,  BLOCKED],  # Bangalore Apex  (2)
    [BLOCKED,     600,      570,       0,     1100],  # Hyderabad Core  (3)
    [BLOCKED, BLOCKED,  BLOCKED,    1100,        0],  # Delhi Hub       (4)
]


def get_hub_index(name):
    """O(V) linear search — no dicts. Returns index 0-4 or -1 if not found."""
    for i in range(len(hub_names)):
        if hub_names[i] == name:
            return i
    return -1
