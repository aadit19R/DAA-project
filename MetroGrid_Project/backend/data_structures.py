"""
data_structures.py — Stack, Queue, CircularQueue, Node, LinkedList.
No trees, no hash tables. All structures are explicit OOP classes.
"""


# ============================================================================
# CLASS 1: Stack
# ============================================================================

class Stack:
    """LIFO stack — used by Dijkstra to reverse the pred[] chain into a forward route."""

    def __init__(self):
        self._items = []

    def push(self, item):
        self._items.append(item)

    def pop(self):
        """Remove and return the top item. Returns None if empty."""
        if not self.is_empty():
            return self._items.pop()
        return None

    def is_empty(self):
        return len(self._items) == 0


# ============================================================================
# CLASS 2: Queue
# ============================================================================

class Queue:
    """FIFO queue. enqueue O(1), dequeue O(N) due to list.pop(0) shifting."""

    def __init__(self):
        self._items = []

    def enqueue(self, item):
        self._items.append(item)

    def dequeue(self):
        """Remove and return the front item. Returns None if empty."""
        if not self.is_empty():
            return self._items.pop(0)
        return None

    def is_empty(self):
        return len(self._items) == 0


# ============================================================================
# CLASS 3: CircularQueue
# ============================================================================

class CircularQueue:
    """
    Fixed-capacity ring buffer — used as the live activity logger.
    All ops O(1). When full, the oldest entry is silently overwritten.
    front == -1 is the empty sentinel; wrap-around uses (i + 1) % capacity.
    """

    def __init__(self, capacity):
        self.capacity = capacity
        self.queue    = [None] * capacity
        self.front    = -1  # -1 = empty
        self.rear     = -1

    def is_empty(self):
        return self.front == -1

    def is_full(self):
        return (self.rear + 1) % self.capacity == self.front

    def enqueue(self, item):
        """Insert item. If full, evicts the oldest entry to make room."""
        if self.is_full():
            self.front = (self.front + 1) % self.capacity  # evict oldest
            self.rear  = (self.rear  + 1) % self.capacity
            self.queue[self.rear] = item
        elif self.is_empty():
            self.front = 0
            self.rear  = 0
            self.queue[self.rear] = item
        else:
            self.rear = (self.rear + 1) % self.capacity
            self.queue[self.rear] = item

    def get_all(self):
        """Return all items in order from front to rear."""
        if self.is_empty():
            return []
        items = []
        i = self.front
        while True:
            items.append(self.queue[i])
            if i == self.rear:
                break
            i = (i + 1) % self.capacity
        return items


# ============================================================================
# CLASS 4: Node  (helper for LinkedList)
# ============================================================================

class Node:
    """Single node for the LinkedList — holds a drone dict and a .next pointer."""

    def __init__(self, data):
        self.data = data
        self.next = None


# ============================================================================
# CLASS 5: LinkedList
# ============================================================================

class LinkedList:
    """
    Singly linked list — the Active Fleet Registry.
    register_drone O(N), delete_node O(N), merge_sort O(N log N).
    """

    def __init__(self):
        self.head = None

    # ------------------------------------------------------------------
    # Core Registry Methods
    # ------------------------------------------------------------------

    def register_drone(self, data):
        """Append a new drone node to the tail. data = {'id', 'battery', 'kilometers'}."""
        new_node = Node(data)
        if not self.head:
            self.head = new_node
            return
        current = self.head
        while current.next:
            current = current.next
        current.next = new_node

    def delete_node(self, drone_id):
        """
        Delete by ID, re-linking prev.next → target.next.
        Returns (success: bool, log: str) for terminal feedback.
        """
        current = self.head
        prev    = None
        while current:
            node_id = current.data['id'] if isinstance(current.data, dict) else current.data
            if node_id == drone_id:
                next_node = current.next
                next_id   = (next_node.data['id']
                             if next_node and isinstance(next_node.data, dict)
                             else (next_node.data if next_node else 'NULL'))

                if prev is None:
                    # Target is the head — advance head forward.
                    self.head = next_node
                    log = (f"> Node [{drone_id}] was HEAD of Linked List.\n"
                           f"> head pointer → {next_id}.\n"
                           f"> Node [{drone_id}] successfully unlinked.")
                else:
                    # Mid/tail — bypass target by wiring prev.next to target.next.
                    prev_id   = prev.data['id'] if isinstance(prev.data, dict) else prev.data
                    prev.next = next_node
                    log = (f"> Node [{drone_id}] located in Linked List.\n"
                           f"> [{prev_id}].next was → [{drone_id}]\n"
                           f"> [{prev_id}].next now → {next_id}.\n"
                           f"> Node [{drone_id}] unlinked. Pointers updated.")

                current.next = None
                return True, log

            prev    = current
            current = current.next

        return False, f"> Node [{drone_id}] not found in registry."

    def get_active_fleet(self):
        """Traverse from head to tail and return an ordered list of node data."""
        fleet   = []
        current = self.head
        while current:
            fleet.append(current.data)
            current = current.next
        return fleet

    def clear(self):
        self.head = None

    # ------------------------------------------------------------------
    # Merge Sort — O(N log N), in-place pointer rearrangement, no sort()
    # ------------------------------------------------------------------

    def merge_sort(self, key='battery', reverse=True):
        """Sort the fleet in-place by 'key'. reverse=True → descending."""
        self.head = self._merge_sort_recursive(self.head, key, reverse)

    def _get_middle(self, head):
        """Fast/slow pointer — returns the last node of the left half."""
        slow = head
        fast = head.next  # offset ensures slow stops at left half's tail
        while fast is not None and fast.next is not None:
            slow = slow.next
            fast = fast.next.next
        return slow

    def _merge_sort_recursive(self, head, key, reverse):
        """Split into halves, sort each recursively, merge results."""
        if head is None or head.next is None:
            return head

        mid        = self._get_middle(head)
        right_head = mid.next
        mid.next   = None  # sever into two independent halves

        left  = self._merge_sort_recursive(head,       key, reverse)
        right = self._merge_sort_recursive(right_head, key, reverse)

        return self._merge(left, right, key, reverse)

    def _merge(self, left, right, key, reverse):
        """
        Merge two sorted lists by re-wiring .next pointers — O(N), O(1) space.
        Uses a dummy sentinel node to avoid special-casing the result head.
        """
        dummy   = Node(None)
        current = dummy

        while left is not None and right is not None:
            left_val  = left.data[key]  if isinstance(left.data,  dict) else 0
            right_val = right.data[key] if isinstance(right.data, dict) else 0

            if (reverse and left_val >= right_val) or (not reverse and left_val <= right_val):
                current.next = left
                left         = left.next
            else:
                current.next = right
                right        = right.next

            current = current.next

        current.next = left if left is not None else right

        return dummy.next
