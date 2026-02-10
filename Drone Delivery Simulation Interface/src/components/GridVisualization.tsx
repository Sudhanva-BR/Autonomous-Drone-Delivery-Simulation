import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Position } from '../App';

interface GridVisualizationProps {
  grid: number[][];
  rechargeStations: Position[];
  path: Position[];
  currentStep: number;
}

export function GridVisualization({
  grid,
  rechargeStations,
  path,
  currentStep,
}: GridVisualizationProps) {
  const [hoveredCell, setHoveredCell] = useState<Position | null>(null);
  const currentPosition = path[currentStep];
  
  // START is ALWAYS at (0,0) and DESTINATION is ALWAYS at (n-1, m-1)
  const startPosition = { x: 0, y: 0 };
  const rows = grid.length;
  const cols = grid[0]?.length || 0;
  const destinationPosition = { x: rows - 1, y: cols - 1 };
  
  const maxHeight = useMemo(() => {
    if (grid.length === 0) return 1;
    return Math.max(...grid.flat());
  }, [grid]);

  const getBackgroundColor = (height: number) => {
    const intensity = (height / maxHeight) * 0.7;
    const grayValue = Math.round(220 - (intensity * 140));
    return `rgb(${grayValue}, ${grayValue}, ${grayValue})`;
  };

  const isRechargeStation = (row: number, col: number) => {
    return rechargeStations.some(station => station.x === row && station.y === col);
  };

  const isOnPath = (row: number, col: number) => {
    return path.some(pos => pos.x === row && pos.y === col);
  };

  const isStart = (row: number, col: number) => {
    return row === 0 && col === 0;
  };

  const isDestination = (row: number, col: number) => {
    return row === rows - 1 && col === cols - 1;
  };

  if (grid.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 text-gray-400">
        <div className="text-center">
          <p className="text-lg mb-2">No simulation loaded</p>
          <p className="text-sm">Enter simulation data and click "Run Simulation"</p>
        </div>
      </div>
    );
  }

  const cellSize = Math.min(500 / Math.max(rows, cols), 80);

  return (
    <div className="flex flex-col items-center justify-center">
      {/* Legend */}
      <div className="mb-4 flex flex-wrap gap-4 text-xs text-gray-700">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 bg-indigo-100 border-2 border-indigo-500 rounded shadow-sm"></div>
          <span className="font-medium">Start (0,0)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 bg-green-100 border-2 border-green-500 rounded shadow-sm"></div>
          <span className="font-medium">Destination ({rows - 1},{cols - 1})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 bg-blue-100 border-2 border-blue-400 rounded border-dashed shadow-sm"></div>
          <span className="font-medium">Path</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-base">⚡</span>
          <span className="font-medium">Recharge Station</span>
        </div>
      </div>

      <div
        className="inline-grid gap-1.5 p-6 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl relative shadow-inner border-2 border-slate-300"
        style={{
          gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
          gridTemplateRows: `repeat(${rows}, ${cellSize}px)`,
        }}
      >
        {grid.map((row, rowIndex) =>
          row.map((height, colIndex) => {
            const isStation = isRechargeStation(rowIndex, colIndex);
            const isPath = isOnPath(rowIndex, colIndex);
            const isStartCell = isStart(rowIndex, colIndex);
            const isDestCell = isDestination(rowIndex, colIndex);
            const isDroneHere =
              currentPosition &&
              currentPosition.x === rowIndex &&
              currentPosition.y === colIndex;
            const isHovered = hoveredCell?.x === rowIndex && hoveredCell?.y === colIndex;

            // Determine background color with priority hierarchy
            let bgColor = getBackgroundColor(height);
            let borderColor = '#d1d5db';
            let borderStyle = 'solid';
            let borderWidth = 2;

            // Priority 5: Path (lowest)
            if (isPath && !isStartCell && !isDestCell) {
              bgColor = '#dbeafe'; // Light blue for path
              borderColor = '#3b82f6';
              borderStyle = 'dashed';
            }

            // Priority 4: Recharge stations
            if (isStation && !isStartCell && !isDestCell) {
              bgColor = '#fef3c7'; // Yellow for recharge stations
              borderColor = '#f59e0b';
            }

            // Priority 2: Destination (higher priority)
            if (isDestCell) {
              bgColor = '#d1fae5'; // Light green for destination
              borderColor = '#10b981';
              borderWidth = 3;
              borderStyle = 'solid';
            }

            // Priority 1: Start (highest priority)
            if (isStartCell) {
              bgColor = '#e0e7ff'; // Light indigo for start
              borderColor = '#6366f1';
              borderWidth = 3;
              borderStyle = 'solid';
            }

            return (
              <div
                key={`${rowIndex}-${colIndex}`}
                className="relative rounded flex items-center justify-center text-sm font-medium transition-all cursor-pointer"
                style={{
                  backgroundColor: bgColor,
                  borderColor: borderColor,
                  borderStyle: borderStyle,
                  borderWidth: `${borderWidth}px`,
                  width: `${cellSize}px`,
                  height: `${cellSize}px`,
                }}
                onMouseEnter={() => setHoveredCell({ x: rowIndex, y: colIndex })}
                onMouseLeave={() => setHoveredCell(null)}
              >
                {/* Building height */}
                <span className={`${
                  isStation ? 'text-amber-800' : 
                  isStartCell ? 'text-indigo-700' : 
                  isDestCell ? 'text-green-700' : 
                  'text-gray-700'
                } text-xs font-semibold`}>
                  {height}
                </span>

                {/* Coordinate tooltip on hover */}
                {isHovered && (
                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap z-20">
                    ({rowIndex}, {colIndex})
                  </div>
                )}

                {/* Start marker (when drone is not here) */}
                {isStartCell && !isDroneHere && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl">🚁</span>
                    <span className="text-[9px] font-bold text-indigo-700 mt-0.5">START</span>
                  </div>
                )}

                {/* Destination marker */}
                {isDestCell && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl">🎯</span>
                    <span className="text-[9px] font-bold text-green-700 mt-0.5">DEST</span>
                  </div>
                )}

                {/* Recharge station icon (lower priority than start/dest) */}
                {isStation && !isStartCell && !isDestCell && (
                  <span className="absolute top-0.5 right-0.5 text-amber-500 text-lg">
                    ⚡
                  </span>
                )}

                {/* Drone - HIGHEST priority, always on top */}
                {isDroneHere && (
                  <motion.div
                    layoutId="drone"
                    className="absolute inset-0 flex items-center justify-center z-10"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{
                      type: 'spring',
                      stiffness: 300,
                      damping: 20,
                    }}
                  >
                    <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center shadow-xl border-3 border-blue-700 ring-4 ring-blue-200">
                      <span className="text-white text-2xl">🚁</span>
                    </div>
                  </motion.div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}