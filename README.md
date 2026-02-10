# 🚁 Autonomous Drone Delivery Simulation

A full-stack simulation system that models autonomous drone delivery over a
2D city grid using **Dijkstra’s algorithm with extended state**.
The project accounts for **building heights, battery constraints, and recharge
stations**, and provides an interactive visualization inspired by real-world
urban challenges.

This project integrates:
- **C++** for high-performance pathfinding
- **Django** as a secure backend orchestration layer
- A **Figma-designed frontend** for step-by-step visualization

---

## 🧪 Problem Statement (Brief)

A delivery drone operates over a 2D grid of buildings, where each cell has a
non-negative height.

The drone:
- Starts at the top-left cell `(0,0)`
- Must reach the bottom-right cell `(N-1, M-1)`
- Has a limited battery capacity
- Consumes battery and time when moving
- Consumes additional battery and time when climbing to higher buildings
- Can recharge its battery at designated recharge stations

Each move to an adjacent cell costs:
- `1` unit of time
- `1` unit of battery

If the destination is unreachable, the system reports `-1`.  
Otherwise, it computes the **minimum possible time** required to complete the
delivery.

(See `problem.md` for the full formal specification.)

---

## 🌆 Design Motivation

I live in **Bangalore, Karnataka, India**, a city well known for heavy traffic
congestion. In many real-world situations, traveling even **1 kilometer by
road can take around 30 minutes**.

This everyday inconvenience motivated the idea of exploring alternative
delivery mechanisms that do not rely on road transportation. Autonomous drones
for short-distance deliveries emerged as a realistic and increasingly relevant
solution, forming the basis of this problem.

---

## 🧠 Algorithmic Approach

The core of the system is a **Dijkstra-based shortest path algorithm** with an
expanded state:

(row, column, remaining_battery)


Key rules:
- Moving costs 1 time and 1 battery
- Moving uphill costs extra time and battery equal to the height difference
- Moving downhill is free (beyond the base move cost)
- Recharge stations restore battery (capped at maximum capacity)

Because battery affects future reachability, each cell must be visited with
different battery states, making simple BFS or naive shortest-path approaches
incorrect.

This guarantees an **optimal solution** while introducing non-trivial trade-offs
between distance, elevation, and energy.

---

## 🧩 System Architecture

Frontend (Figma-based UI)
↓
Django Backend (/api/run/)
↓
C++ Solver (Dijkstra)


- The **C++ solver** is treated as a black box
- Django executes it via `subprocess` with strict safety controls
- The frontend visualizes the solver’s output step-by-step

---

## 🖥️ Frontend Features

- Figma-faithful UI translated to HTML/CSS/JS
- Canvas-based grid visualization
- Visual markers:
  - 🚁 Start
  - 🎯 Destination
  - ⚡ Recharge stations
- Animated drone movement
- Live battery and time tracking
- Play / Pause / Reset controls
- Speed control for animation
- Clear error handling and feedback

---

## ⚙️ Backend Features

- Django REST API (`POST /api/run/`)
- Secure subprocess execution
- Input size validation
- Timeout protection
- Concurrency limiting
- Cross-platform solver support (Windows / Linux)
- Comprehensive automated tests

---

## 📥 Solver Input Format

N M B K
N lines each with M integers (building heights)
S
S lines: r c (1-indexed recharge stations)


Where:
- `N, M` → grid dimensions
- `B` → maximum battery
- `K` → recharge amount

---

## 📤 Solver Output Format

```json
{
  "time": 14,
  "path": [
    { "row": 0, "col": 0, "battery": 20, "time": 0 },
    { "row": 0, "col": 1, "battery": 19, "time": 1 }
  ]
}
🚀 How to Run Locally
1️⃣ Clone the Repository
git clone https://github.com/<your-username>/drone-delivery-simulation.git
cd drone-delivery-simulation
2️⃣ Compile the C++ Solver
g++ -std=gnu++17 -O2 solver.cpp -o bin/solver
# On Windows:
# g++ -std=gnu++17 -O2 solver.cpp -o bin/solver.exe
3️⃣ Install Python Dependencies
pip install -r requirements.txt
4️⃣ Run the Django Server
python manage.py runserver
5️⃣ Open in Browser
http://127.0.0.1:8000/
Paste input → Run Simulation → Visualize path 🎉
