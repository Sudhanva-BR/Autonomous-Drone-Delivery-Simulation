/**
 * DroneViz Frontend – Figma-faithful vanilla JS
 *
 * Workflow:
 *   1. User pastes raw solver input into textarea (N M B K format)
 *   2. Clicks "Run Simulation" → POST /api/run/
 *   3. Backend runs C++ solver → returns JSON with path
 *   4. Frontend parses grid from input + path from response
 *   5. Renders grid on canvas, animates drone along path
 */

/* ──────────── DOM refs ──────────── */
const $ = (id) => document.getElementById(id);

const canvas = $('grid-canvas');
const ctx = canvas.getContext('2d');
const placeholder = $('grid-placeholder');

const statusBadge = $('status-badge');
const batteryText = $('battery-text');
const batteryBar = $('battery-bar');
const totalTimeEl = $('total-time');
const destLabel = $('dest-label');
const legendDest = $('legend-dest-label');

const playBtn = $('play-btn');
const pauseBtn = $('pause-btn');
const resetBtn = $('reset-btn');
const speedSelect = $('speed-select');

const inputToggle = $('input-toggle');
const inputBody = $('input-body');
const toggleIcon = $('toggle-icon');
const helpBtn = $('help-btn');
const helpBox = $('help-box');
const solverInput = $('solver-input');
const runBtn = $('run-btn');

const errorBar = $('error-bar');
const errorMessage = $('error-message');
const errorClose = $('error-close');
const loadingOvl = $('loading-overlay');

/* ──────────── State ──────────── */
let sim = {
    grid: [],            // number[][]
    rows: 0,
    cols: 0,
    maxBattery: 0,
    rechargeK: 0,
    rechargeStations: [],// {r, c}[]
    path: [],            // {row, col, battery, time}[]
    currentStep: 0,
    batteryLevel: 0,
    totalTime: 0,
    isRunning: false,
    speed: 1,
    status: 'idle',      // idle | ready | running | paused | completed | error
};

let animInterval = null;

/* ──────────── Default input ──────────── */
const DEFAULT_INPUT = `5 6 20 10
1 2 3 2 1 2
2 3 4 3 2 1
1 2 5 4 3 2
2 1 3 2 1 3
1 2 2 1 2 1
2
1 1
3 4`;

/* ──────────── Utilities ──────────── */

function showError(msg) {
    errorMessage.textContent = msg;
    errorBar.classList.remove('hidden');
}

function hideError() {
    errorBar.classList.add('hidden');
}

function showLoading() {
    loadingOvl.classList.remove('hidden');
    runBtn.disabled = true;
}

function hideLoading() {
    loadingOvl.classList.add('hidden');
    runBtn.disabled = false;
}

function setStatus(status) {
    sim.status = status;
    const labels = {
        idle: 'Idle', ready: 'Ready', running: 'Running',
        paused: 'Paused', completed: 'Completed', error: 'Error',
    };
    statusBadge.textContent = labels[status] || status;
    statusBadge.className = `status-badge status-${status}`;
    updateControls();
}

function updateBatteryUI() {
    const max = sim.maxBattery || 1;
    const pct = Math.max(0, Math.min(100, (sim.batteryLevel / max) * 100));
    batteryText.textContent = `${sim.batteryLevel} / ${sim.maxBattery}`;
    batteryBar.style.width = pct + '%';

    batteryBar.classList.remove('battery-low', 'battery-medium', 'battery-high');
    if (pct > 60) batteryBar.classList.add('battery-high');
    else if (pct > 30) batteryBar.classList.add('battery-medium');
    else batteryBar.classList.add('battery-low');
}

function updateTimeUI() {
    if (sim.path.length > 0 && sim.currentStep < sim.path.length) {
        totalTimeEl.textContent = sim.path[sim.currentStep].time;
    } else {
        totalTimeEl.textContent = sim.totalTime;
    }
}

function updateControls() {
    const canPlay = sim.path.length > 0 &&
        sim.currentStep < sim.path.length - 1 &&
        !sim.isRunning;
    playBtn.disabled = !canPlay;
    pauseBtn.disabled = !sim.isRunning;
    resetBtn.disabled = sim.path.length === 0;
}

/* ──────────── Input parsing ──────────── */

/**
 * Parse raw solver input to extract grid, dimensions, recharge stations.
 * Does NOT parse path — that comes from the solver response.
 */
function parseInputForGrid(text) {
    const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return null;

    const first = lines[0].split(/\s+/).map(Number);
    if (first.length !== 4 || first.some(isNaN)) return null;
    const [N, M, B, K] = first;

    if (N <= 0 || M <= 0 || lines.length < N + 1) return null;

    const grid = [];
    for (let i = 1; i <= N; i++) {
        const row = lines[i].split(/\s+/).map(Number);
        if (row.length !== M || row.some(isNaN)) return null;
        grid.push(row);
    }

    const stations = [];
    if (lines.length > N + 1) {
        const S = parseInt(lines[N + 1], 10);
        if (!isNaN(S) && S >= 0) {
            for (let i = 0; i < S && (N + 2 + i) < lines.length; i++) {
                const parts = lines[N + 2 + i].split(/\s+/).map(Number);
                if (parts.length === 2 && !parts.some(isNaN)) {
                    stations.push({ r: parts[0], c: parts[1] });
                }
            }
        }
    }

    return { grid, rows: N, cols: M, maxBattery: B, rechargeK: K, stations };
}

/* ──────────── Canvas rendering ──────────── */

const CELL_GAP = 6;

function cellSize() {
    const maxCells = Math.max(sim.rows, sim.cols, 1);
    return Math.min(Math.floor(500 / maxCells), 80);
}

function drawGrid() {
    if (sim.grid.length === 0) {
        canvas.width = 0;
        canvas.height = 0;
        placeholder.classList.remove('hidden');
        return;
    }
    placeholder.classList.add('hidden');

    const cs = cellSize();
    const w = sim.cols * (cs + CELL_GAP) - CELL_GAP;
    const h = sim.rows * (cs + CELL_GAP) - CELL_GAP;
    canvas.width = w;
    canvas.height = h;

    const maxH = Math.max(1, ...sim.grid.flat());

    // Path lookup
    const pathSet = new Set();
    sim.path.forEach(p => pathSet.add(`${p.row},${p.col}`));

    for (let r = 0; r < sim.rows; r++) {
        for (let c = 0; c < sim.cols; c++) {
            const x = c * (cs + CELL_GAP);
            const y = r * (cs + CELL_GAP);
            const height = sim.grid[r][c];
            const isStation = sim.rechargeStations.some(s => s.r === r && s.c === c);
            const onPath = pathSet.has(`${r},${c}`);
            const isStart = r === 0 && c === 0;
            const isDest = r === sim.rows - 1 && c === sim.cols - 1;

            // Background: height-based gray
            const intensity = (height / maxH) * 0.7;
            const gv = Math.round(220 - intensity * 140);
            let bg = `rgb(${gv},${gv},${gv})`;
            let borderColor = '#d1d5db';
            let borderW = 2;
            let borderStyle = 'solid';

            // Path cells
            if (onPath && !isStart && !isDest) {
                bg = '#dbeafe';
                borderColor = '#3b82f6';
                borderStyle = 'dashed';
            }

            // Recharge station
            if (isStation && !isStart && !isDest) {
                bg = '#fef3c7';
                borderColor = '#f59e0b';
                borderStyle = 'solid';
            }

            // Destination
            if (isDest) {
                bg = '#d1fae5';
                borderColor = '#10b981';
                borderW = 3;
            }

            // Start
            if (isStart) {
                bg = '#e0e7ff';
                borderColor = '#6366f1';
                borderW = 3;
            }

            // Draw cell
            ctx.fillStyle = bg;
            ctx.fillRect(x, y, cs, cs);
            ctx.strokeStyle = borderColor;
            ctx.lineWidth = borderW;
            if (borderStyle === 'dashed') ctx.setLineDash([4, 3]);
            else ctx.setLineDash([]);
            ctx.strokeRect(x + borderW / 2, y + borderW / 2, cs - borderW, cs - borderW);
            ctx.setLineDash([]);

            // Height text
            const fontSize = Math.max(10, Math.min(cs * 0.3, 14));
            ctx.font = `600 ${fontSize}px Inter, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            if (isStation && !isStart && !isDest) ctx.fillStyle = '#92400e';
            else if (isStart) ctx.fillStyle = '#4338ca';
            else if (isDest) ctx.fillStyle = '#15803d';
            else ctx.fillStyle = '#374151';
            ctx.fillText(String(height), x + cs / 2, y + cs / 2);

            // Emoji icons
            const emojiSize = Math.max(12, Math.min(cs * 0.45, 28));

            if (isStart) {
                ctx.font = `${emojiSize}px serif`;
                ctx.fillText('🚁', x + cs / 2, y + cs * 0.35);
                ctx.font = `bold ${Math.max(7, cs * 0.14)}px Inter, sans-serif`;
                ctx.fillStyle = '#4338ca';
                ctx.fillText('START', x + cs / 2, y + cs * 0.78);
            }

            if (isDest) {
                ctx.font = `${emojiSize}px serif`;
                ctx.fillText('🎯', x + cs / 2, y + cs * 0.35);
                ctx.font = `bold ${Math.max(7, cs * 0.14)}px Inter, sans-serif`;
                ctx.fillStyle = '#15803d';
                ctx.fillText('DEST', x + cs / 2, y + cs * 0.78);
            }

            // Recharge station icon (not start/dest)
            if (isStation && !isStart && !isDest) {
                const iconSize = Math.max(10, cs * 0.35);
                ctx.font = `${iconSize}px serif`;
                ctx.textAlign = 'right';
                ctx.textBaseline = 'top';
                ctx.fillText('⚡', x + cs - 2, y + 2);
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
            }
        }
    }

    // Draw drone
    drawDrone();
}

function drawDrone() {
    if (sim.path.length === 0 || sim.currentStep >= sim.path.length) return;

    const step = sim.path[sim.currentStep];
    const cs = cellSize();
    const cx = step.col * (cs + CELL_GAP) + cs / 2;
    const cy = step.row * (cs + CELL_GAP) + cs / 2;
    const radius = Math.max(14, cs * 0.4);

    // Blue circle
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#3b82f6';
    ctx.fill();
    ctx.strokeStyle = '#1d4ed8';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Outer ring
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 4, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(191,219,254,0.7)';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Drone emoji
    const emojiSize = Math.max(12, radius * 1.1);
    ctx.font = `${emojiSize}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🚁', cx, cy);
}

/* ──────────── Hover tooltip ──────────── */

canvas.addEventListener('mousemove', (e) => {
    if (sim.grid.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const cs = cellSize();
    const col = Math.floor(mx / (cs + CELL_GAP));
    const row = Math.floor(my / (cs + CELL_GAP));

    // Remove existing tooltip
    const old = document.querySelector('.cell-tooltip');
    if (old) old.remove();

    if (row >= 0 && row < sim.rows && col >= 0 && col < sim.cols) {
        const tip = document.createElement('div');
        tip.className = 'cell-tooltip';
        tip.textContent = `(${row}, ${col})  h=${sim.grid[row][col]}`;
        const wrapper = canvas.parentElement;
        const cellX = col * (cs + CELL_GAP) + cs / 2;
        const cellY = row * (cs + CELL_GAP);
        tip.style.left = cellX + 'px';
        tip.style.top = (cellY - 6) + 'px';
        wrapper.style.position = 'relative';
        wrapper.appendChild(tip);
    }
});

canvas.addEventListener('mouseleave', () => {
    const old = document.querySelector('.cell-tooltip');
    if (old) old.remove();
});

/* ──────────── Animation ──────────── */

function startAnimation() {
    if (sim.currentStep >= sim.path.length - 1) return;
    sim.isRunning = true;
    setStatus('running');

    const interval = 1000 / sim.speed;
    animInterval = setInterval(() => {
        sim.currentStep++;
        const step = sim.path[sim.currentStep];

        sim.batteryLevel = step.battery;
        sim.totalTime = step.time;

        updateBatteryUI();
        updateTimeUI();
        drawGrid();

        if (sim.currentStep >= sim.path.length - 1) {
            stopAnimation();
            setStatus('completed');
        }
    }, interval);
}

function stopAnimation() {
    sim.isRunning = false;
    if (animInterval) {
        clearInterval(animInterval);
        animInterval = null;
    }
    updateControls();
}

function resetSimulation() {
    stopAnimation();
    sim.currentStep = 0;
    if (sim.path.length > 0) {
        sim.batteryLevel = sim.path[0].battery;
        sim.totalTime = sim.path[0].time;
    } else {
        sim.batteryLevel = sim.maxBattery;
        sim.totalTime = 0;
    }
    setStatus(sim.path.length > 0 ? 'ready' : 'idle');
    updateBatteryUI();
    updateTimeUI();
    drawGrid();
}

/* ──────────── API call ──────────── */

async function runSimulation() {
    const inputText = solverInput.value.trim();
    if (!inputText) {
        showError('Please enter solver input');
        return;
    }

    // Parse grid from input for visualization
    const parsed = parseInputForGrid(inputText);
    if (!parsed) {
        showError('Invalid input format. Expected: N M B K, then grid, then stations.');
        return;
    }

    // Update grid state immediately
    sim.grid = parsed.grid;
    sim.rows = parsed.rows;
    sim.cols = parsed.cols;
    sim.maxBattery = parsed.maxBattery;
    sim.rechargeK = parsed.rechargeK;
    sim.rechargeStations = parsed.stations;
    sim.path = [];
    sim.currentStep = 0;
    sim.batteryLevel = parsed.maxBattery;
    sim.totalTime = 0;

    // Update destination label
    destLabel.textContent = `(${sim.rows - 1}, ${sim.cols - 1})`;
    legendDest.textContent = `Destination (${sim.rows - 1},${sim.cols - 1})`;

    hideError();
    showLoading();
    drawGrid();
    setStatus('idle');

    try {
        const response = await fetch('/api/run/', {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: inputText,
        });

        const data = await response.json();

        if (!response.ok) {
            const msg = data.error || `HTTP ${response.status}`;
            showError(msg);
            setStatus('error');
            hideLoading();
            return;
        }

        // Parse path from solver response
        if (data.path && Array.isArray(data.path)) {
            sim.path = data.path.map(p => ({
                row: p.row,
                col: p.col,
                battery: p.battery,
                time: p.time,
            }));
        }

        if (data.time !== undefined) {
            sim.totalTime = data.time;
        }

        // Set initial battery from first path step
        if (sim.path.length > 0) {
            sim.batteryLevel = sim.path[0].battery;
            sim.totalTime = sim.path[0].time;
        }

        setStatus('ready');
        updateBatteryUI();
        updateTimeUI();
        drawGrid();

    } catch (err) {
        showError(`Network error: ${err.message}`);
        setStatus('error');
    } finally {
        hideLoading();
    }
}

/* ──────────── Event listeners ──────────── */

// Input toggle
inputToggle.addEventListener('click', () => {
    inputBody.classList.toggle('hidden');
    toggleIcon.classList.toggle('open');
});

// Help toggle
helpBtn.addEventListener('click', () => {
    helpBox.classList.toggle('hidden');
});

// Run
runBtn.addEventListener('click', runSimulation);

// Play
playBtn.addEventListener('click', () => {
    if (!sim.isRunning && sim.currentStep < sim.path.length - 1) {
        startAnimation();
    }
});

// Pause
pauseBtn.addEventListener('click', () => {
    stopAnimation();
    setStatus('paused');
});

// Reset
resetBtn.addEventListener('click', resetSimulation);

// Speed
speedSelect.addEventListener('change', (e) => {
    sim.speed = parseFloat(e.target.value);
    // If running, restart with new speed
    if (sim.isRunning) {
        stopAnimation();
        startAnimation();
    }
});

// Error close
errorClose.addEventListener('click', hideError);

/* ──────────── Init ──────────── */

function init() {
    solverInput.value = DEFAULT_INPUT;
    // Start with input expanded
    inputBody.classList.remove('hidden');
    toggleIcon.classList.add('open');

    // Parse default input to show grid immediately
    const parsed = parseInputForGrid(DEFAULT_INPUT);
    if (parsed) {
        sim.grid = parsed.grid;
        sim.rows = parsed.rows;
        sim.cols = parsed.cols;
        sim.maxBattery = parsed.maxBattery;
        sim.rechargeK = parsed.rechargeK;
        sim.rechargeStations = parsed.stations;
        sim.batteryLevel = parsed.maxBattery;

        destLabel.textContent = `(${sim.rows - 1}, ${sim.cols - 1})`;
        legendDest.textContent = `Destination (${sim.rows - 1},${sim.cols - 1})`;

        drawGrid();
        updateBatteryUI();
    }

    setStatus('idle');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
