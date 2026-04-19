# MetroGrid Command Center 🛰️
**Autonomous Supply Chain & Logistics Network Dashboard**

MetroGrid is a full-stack logistics simulation dashboard that demonstrates the practical application of core **Design and Analysis of Algorithms (DAA)** concepts. It simulates an autonomous transit network across five major Indian city hubs, optimizing routes, infrastructure, and fleet performance using manually implemented data structures—strictly avoiding built-in sorting or graph libraries.

---

## 🛠️ Tech Stack
- **Backend:** Python (Flask)
- **Frontend:** Vanilla JavaScript, HTML5, CSS3 (Modern Glassmorphism Design)
- **Data Model:** Pure Object-Oriented implementations with no external libraries.

---

## 🧠 Data Structures & Algorithms

This project serves as a comprehensive demonstration of the following computer science fundamentals:

### 🚀 Algorithms
1.  **Freight Navigator (Dijkstra's Algorithm):** 
    - Computes the shortest path between city hubs in a sparse graph.
    - Uses an **O(V²)** manual linear scan to find the minimum distance node (replaces a priority queue to satisfy tree constraints).
2.  **Infrastructure Optimizer (Prim's MST):** 
    - Connects all hubs using the Minimum Spanning Tree to minimize rail network infrastructure costs.
    - Implemented with manual nested loops to find the minimum cut edge across the **Adjacency Matrix**.
3.  **Fleet Performance Optimizer (Merge Sort):** 
    - Sorts the active drone registry by battery level or distance traveled.
    - Logic: Recursive **Divide & Conquer** on a Singly Linked List using the **Fast/Slow Pointer** technique for splitting and pointer manipulation for merging.

### 🏗️ Custom Data Structures
- **Singly Linked List:** Manages the active fleet registry with dynamic registration and O(1) tail-append logic.
- **Circular Queue:** Implements a fixed-size (cap=5) **Live Activity Logger** that automatically overwrites the oldest events.
- **Stack:** Used for route reconstruction in Dijkstra's algorithm (LIFO).
- **FIFO Queue:** Manages the drone dispatch bay logic.
- **Adjacency Matrix:** A 2D array representation of the transit network distances and bottlenecks.

---

## 📂 Project Structure

```text
MetroGrid_Project/
├── backend/
│   ├── algorithms.py       # Dijkstra, Prim's logic
│   ├── data_structures.py  # Manual Stack, Queue, LinkedList, CircularQueue classes
│   ├── config.py           # Adjacency Matrix & Hub data
│   └── app.py              # Flask API routes
└── frontend/
    ├── templates/
    │   └── index.html      # Glassmorphic UI Dashboard
    └── static/
        ├── js/
        │   ├── api.js      # Backend fetch communication
        │   ├── ui.js       # DOM manipulation & terminal animations
        │   └── main.js     # Event orchestration (Controller)
        └── css/
            └── style.css   # Modern dark-mode aesthetics
├── requirements.txt        # Flask dependency
└── .gitignore              # Environment exclusion
```

---

## 🚀 Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/aadit19R/DAA-project.git
   cd DAA-project
   ```

2. **Set up a virtual environment:**
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows use `venv\Scripts\activate`
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Launch the Command Center:**
   ```bash
   cd MetroGrid_Project/backend
   python3 app.py
   ```

5. **Access the Dashboard:**
   Open your browser and navigate to `http://127.0.0.1:5001`.

---

## 📡 Live Features
- **Real-time Terminal Logs:** Watch pointer changes and algorithm steps unfold in a typewriter-style terminal.
- **Dynamic Pointer Manipulation:** Remove drones and see exactly how the `.next` pointers are re-wired in the Linked List.
- **Rolling Activity Buffer:** The System Monitor keeps you informed of every major background algorithm execution.
