🚁 Autonomous Drone Delivery Simulation

A full-stack simulation system that models autonomous drone delivery over a 2D city grid using Dijkstra’s algorithm, considering building heights, battery constraints, and recharge stations.

The project combines:

C++ for high-performance pathfinding

Django as a secure backend orchestration layer

Figma-designed frontend for interactive visualization

📌 Problem Overview

In dense urban environments (inspired by real-world traffic conditions), drones are used to deliver items efficiently.

Each delivery scenario is modeled as:

A 2D grid of buildings with varying heights

A drone that:

Starts at (0, 0)

Must reach (N-1, M-1)

Has limited battery capacity

Consumes more energy when climbing higher buildings

Can recharge at specific stations

The objective is to compute the minimum time required to complete the delivery, or determine that it is impossible.

🧠 Core Algorithm

Dijkstra’s Algorithm with State Expansion

Each state includes:

(row, col)

remaining battery

total time

Moving rules:

Each move costs 1 time + 1 battery

Climbing to a higher building costs extra time and battery

Moving downhill costs nothing extra

Recharge stations add battery (capped at max capacity)

The algorithm guarantees the globally optimal solution.

🧩 Project Architecture
Frontend (Figma-based UI)
        ↓
Django Backend (/api/run/)
        ↓
C++ Solver (Dijkstra)


The C++ solver is treated as a black box

Django runs it via subprocess with:

Input validation

Timeout protection

Concurrency limits

Frontend visualizes the solver’s JSON output step-by-step

📥 Input Format (Solver)
N M B K
N lines with M integers (building heights)
S
S lines: r c   (1-indexed recharge station coordinates)


Where:

N, M → grid dimensions

B → maximum battery

K → recharge amount

Start → (0,0)

Destination → (N-1, M-1)

📤 Output Format (Solver)
{
  "time": 14,
  "path": [
    { "row": 0, "col": 0, "battery": 20, "time": 0 },
    { "row": 0, "col": 1, "battery": 19, "time": 1 }
  ]
}

🖥️ Frontend Features

Figma-faithful UI (translated to HTML/CSS/JS)

Canvas-based grid rendering

Visual indicators:

🚁 Start

🎯 Destination

⚡ Recharge stations

Animated drone movement

Battery bar and time tracker

Play / Pause / Reset controls

Speed selector (0.5× – 4×)

Error handling with toast notifications

⚙️ Backend Features

Django REST API (POST /api/run/)

Secure subprocess execution

Timeout protection (10 seconds)

Input size limits

Cross-platform solver support (solver / solver.exe)

Concurrency limit using semaphore

Comprehensive test coverage

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

4️⃣ Run Django Server
python manage.py runserver

5️⃣ Open in Browser
http://127.0.0.1:8000/


Paste input → Run Simulation → Visualize path 🎉
