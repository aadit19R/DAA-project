"""
data_structures.py — MetroGrid Core OOP Data Structures

Contains the five formal class definitions required by the DAA specification.
Constraints: No Trees, No Hash Tables. All structures are explicit OOP classes.
"""


class Stack:
    """
    LIFO Stack for the Freight Route Log.
    Dijkstra pushes predecessor nodes onto this stack, then pops them to
    reconstruct the forward-order delivery path.
    Time Complexity: O(1) push/pop.
    """

    def __init__(self):
        self._items = []

    def push(self, item):
        """Push an item onto the top of the stack."""
        self._items.append(item)

    def pop(self):
        """Remove and return the top item. Returns None if empty."""
        if not self.is_empty():
            return self._items.pop()
        return None

    def is_empty(self):
        """Return True if the stack contains no elements."""
        return len(self._items) == 0


class Queue:
    """
    FIFO Queue for the Drone Dispatch Bay.
    Drones enter at the rear via enqueue() and are processed
    from the front via dequeue() in strict arrival order.
    Time Complexity: O(1) enqueue, O(N) dequeue (front of list).
    """

    def __init__(self):
        self._items = []

    def enqueue(self, item):
        """Add an item to the rear of the queue."""
        self._items.append(item)

    def dequeue(self):
        """Remove and return the front item. Returns None if empty."""
        if not self.is_empty():
            return self._items.pop(0)
        return None

    def is_empty(self):
        """Return True if the queue contains no elements."""
        return len(self._items) == 0


class CircularQueue:
    """
    Fixed-capacity ring buffer for the Live Activity Logger.
    Uses modulo arithmetic (%) on front/rear pointers to wrap around a
    fixed-size array. When full, the oldest alert is overwritten automatically.
    Time Complexity: O(1) enqueue, O(N) full read.
    """

    def __init__(self, capacity):
        self.capacity = capacity
        self.queue    = [None] * capacity
        self.front    = -1
        self.rear     = -1

    def is_empty(self):
        """Return True if no elements are stored."""
        return self.front == -1

    def is_full(self):
        """Return True when the next rear slot wraps around to front."""
        return (self.rear + 1) % self.capacity == self.front

    def enqueue(self, item):
        """
        Insert a new alert into the ring buffer.
        If full, the oldest entry is dropped by advancing the front pointer.
        """
        if self.is_full():
            # Ring overflow: advance front to discard oldest entry
            self.front = (self.front + 1) % self.capacity
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
        """Traverse the ring from front to rear and return all stored alerts."""
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


class Node:
    """A single node in the Singly Linked List. Holds data and a next pointer."""

    def __init__(self, data):
        self.data = data
        self.next = None


class LinkedList:
    """
    Singly Linked List for the Active Fleet Registry.
    Supports dynamic registration/removal of drones and in-place
    Merge Sort for the Fleet Performance Optimizer.
    Time Complexity: O(N) traversal | O(N log N) merge_sort.
    """

    def __init__(self):
        self.head = None

    # ------------------------------------------------------------------
    # Core Registry Methods
    # ------------------------------------------------------------------

    def register_drone(self, data):
        """
        Append a new drone Node to the tail of the list.
        'data' may be a plain string (legacy) or a dict
        {'id', 'battery', 'kilometers'} for the optimizer.
        """
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
        Delete a drone by ID, re-linking the surrounding .next pointers.
        Returns a tuple (success: bool, log: str) that describes the exact
        pointer manipulation performed — used for terminal feedback.
        """
        current = self.head
        prev    = None
        while current:
            node_id = current.data['id'] if isinstance(current.data, dict) else current.data
            if node_id == drone_id:
                # --- POINTER MANIPULATION ---
                next_node = current.next
                next_id   = (next_node.data['id']
                             if next_node and isinstance(next_node.data, dict)
                             else (next_node.data if next_node else 'NULL'))

                if prev is None:
                    # Target is the HEAD — advance head pointer to next node
                    self.head = next_node
                    log = (f"> Node [{drone_id}] was HEAD of Linked List.\n"
                           f"> head pointer → {next_id}.\n"
                           f"> Node [{drone_id}] successfully unlinked.")
                else:
                    # Bypass the target by wiring prev.next to target.next
                    prev_id   = prev.data['id'] if isinstance(prev.data, dict) else prev.data
                    prev.next = next_node
                    log = (f"> Node [{drone_id}] located in Linked List.\n"
                           f"> [{prev_id}].next was → [{drone_id}]\n"
                           f"> [{prev_id}].next now → {next_id}.\n"
                           f"> Node [{drone_id}] unlinked. Pointers updated.")

                current.next = None  # isolate removed node for GC
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
        """Reset the list to empty state."""
        self.head = None

    # ------------------------------------------------------------------
    # Merge Sort (in-place, pointer-rearranging, no built-in sort)
    # ------------------------------------------------------------------

    def merge_sort(self, key='battery', reverse=True):
        """
        Sort this Linked List in-place using Merge Sort.
        Time Complexity: O(N log N) — recursive halving + linear merging.
        Space Complexity: O(log N) — call stack only, no temporary arrays.

        Args:
            key     (str):  Dict key to sort by ('battery' or 'distance').
            reverse (bool): True = descending (highest first).
        """
        self.head = self._merge_sort_recursive(self.head, key, reverse)

    def _get_middle(self, head):
        """
        Fast/Slow Pointer technique to locate the middle node.
        'slow' advances one step; 'fast' advances two steps per iteration.
        When 'fast' exhausts the list, 'slow' is at the midpoint.
        """
        slow = head
        fast = head.next  # offset so 'slow' stops at LEFT half's last node
        while fast is not None and fast.next is not None:
            slow = slow.next
            fast = fast.next.next
        return slow  # slow.next is the start of the right half

    def _merge_sort_recursive(self, head, key, reverse):
        """Recursively split the list in halves until single nodes, then merge."""
        # Base case: empty list or single element
        if head is None or head.next is None:
            return head

        # --- DIVIDE: find midpoint and sever the link ---
        mid        = self._get_middle(head)
        right_head = mid.next
        mid.next   = None          # cut the list into two independent halves

        # Recursively sort each half
        left  = self._merge_sort_recursive(head,       key, reverse)
        right = self._merge_sort_recursive(right_head, key, reverse)

        # --- CONQUER: merge two sorted halves back together ---
        return self._merge(left, right, key, reverse)

    def _merge(self, left, right, key, reverse):
        """
        Merge two sorted linked lists by rearranging .next pointers only.
        No temporary storage — compares node values and stitches in place.
        """
        # Sentinel head node avoids special-casing an empty result list
        dummy   = Node(None)
        current = dummy

        while left is not None and right is not None:
            left_val  = left.data[key]  if isinstance(left.data,  dict) else 0
            right_val = right.data[key] if isinstance(right.data, dict) else 0

            # Pick the node that satisfies the ordering condition
            if (reverse and left_val >= right_val) or (not reverse and left_val <= right_val):
                current.next = left
                left         = left.next
            else:
                current.next = right
                right        = right.next

            current      = current.next

        # Attach whichever half still has remaining nodes
        current.next = left if left is not None else right

        return dummy.next  # skip the sentinel, return the real merged head
