import React, { useState, useEffect, useRef } from 'react';
import { GridVisualization } from './components/GridVisualization';
import { ControlPanel } from './components/ControlPanel';
import { SimulationInfo } from './components/SimulationInfo';
import { InputPanel } from './components/InputPanel';

export interface Position {
  x: number;
  y: number;
}

export interface SimulationState {
  grid: number[][];
  rechargeStations: Position[];
  path: Position[];
  currentStep: number;
  batteryLevel: number;
  maxBattery: number;
  totalTime: number;
  isRunning: boolean;
  speed: number;
  status: 'idle' | 'ready' | 'running' | 'paused' | 'completed' | 'unreachable';
}

const parseInput = (input: string): Partial<SimulationState> | null => {
  try {
    const lines = input.trim().split('\n').filter(line => line.trim());
    if (lines.length === 0) return null;

    // Parse grid dimensions
    const [rows, cols] = lines[0].split(' ').map(Number);
    
    // Parse grid heights
    const grid: number[][] = [];
    for (let i = 1; i <= rows; i++) {
      const row = lines[i].split(' ').map(Number);
      grid.push(row);
    }

    // Parse recharge stations
    const numStations = parseInt(lines[rows + 1]);
    const rechargeStations: Position[] = [];
    for (let i = 0; i < numStations; i++) {
      const [x, y] = lines[rows + 2 + i].split(' ').map(Number);
      rechargeStations.push({ x, y });
    }

    // Parse path
    const numPathPoints = parseInt(lines[rows + 2 + numStations]);
    const path: Position[] = [];
    for (let i = 0; i < numPathPoints; i++) {
      const [x, y] = lines[rows + 3 + numStations + i].split(' ').map(Number);
      path.push({ x, y });
    }

    return {
      grid,
      rechargeStations,
      path,
      currentStep: 0,
      batteryLevel: 100,
      maxBattery: 100,
      totalTime: 0,
      status: 'ready',
    };
  } catch (error) {
    console.error('Failed to parse input:', error);
    return null;
  }
};

const defaultInput = `5 6
1 2 3 2 1 2
2 3 4 3 2 1
1 2 5 4 3 2
2 1 3 2 1 3
1 2 2 1 2 1
2
1 1
3 4
12
0 0
0 1
1 1
1 2
2 2
2 3
3 3
3 4
3 5
4 5
4 4
4 3`;

export default function App() {
  const [simulation, setSimulation] = useState<SimulationState>({
    grid: [],
    rechargeStations: [],
    path: [],
    currentStep: 0,
    batteryLevel: 100,
    maxBattery: 100,
    totalTime: 0,
    isRunning: false,
    speed: 1,
    status: 'idle',
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load default simulation on mount
  useEffect(() => {
    const parsed = parseInput(defaultInput);
    if (parsed) {
      setSimulation(prev => ({ ...prev, ...parsed }));
    }
  }, []);

  // Simulation loop
  useEffect(() => {
    if (simulation.isRunning && simulation.currentStep < simulation.path.length - 1) {
      const interval = 1000 / simulation.speed;
      
      intervalRef.current = setInterval(() => {
        setSimulation(prev => {
          const nextStep = prev.currentStep + 1;
          const currentPos = prev.path[nextStep];
          
          // Check if at recharge station
          const isAtStation = prev.rechargeStations.some(
            station => station.x === currentPos.x && station.y === currentPos.y
          );
          
          // Update battery (decrease by 5 per step, recharge to 100 at station)
          let newBattery = isAtStation ? 100 : Math.max(0, prev.batteryLevel - 5);
          
          // If path is complete, stop
          if (nextStep >= prev.path.length - 1) {
            return {
              ...prev,
              currentStep: nextStep,
              batteryLevel: newBattery,
              totalTime: prev.totalTime + 1,
              isRunning: false,
              status: 'completed',
            };
          }
          
          return {
            ...prev,
            currentStep: nextStep,
            batteryLevel: newBattery,
            totalTime: prev.totalTime + 1,
          };
        });
      }, interval);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [simulation.isRunning, simulation.currentStep, simulation.speed, simulation.path.length]);

  const handleRunSimulation = (input: string) => {
    const parsed = parseInput(input);
    if (parsed) {
      setSimulation(prev => ({
        ...prev,
        ...parsed,
        currentStep: 0,
        batteryLevel: parsed.maxBattery || 100,
        totalTime: 0,
        isRunning: false,
        status: 'ready',
      }));
    }
  };

  const handlePlay = () => {
    if (simulation.currentStep < simulation.path.length - 1) {
      setSimulation(prev => ({ ...prev, isRunning: true, status: 'running' }));
    }
  };

  const handlePause = () => {
    setSimulation(prev => ({ ...prev, isRunning: false, status: 'paused' }));
  };

  const handleReset = () => {
    setSimulation(prev => ({
      ...prev,
      currentStep: 0,
      batteryLevel: prev.maxBattery,
      totalTime: 0,
      isRunning: false,
      status: prev.grid.length > 0 ? 'ready' : 'idle',
    }));
  };

  const handleSpeedChange = (speed: number) => {
    setSimulation(prev => ({ ...prev, speed }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="container mx-auto px-6 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold text-gray-900 mb-2">
            Autonomous Drone Delivery Simulation
          </h1>
          <p className="text-gray-700">
            Visualize drone navigation through a city grid with dynamic pathfinding and battery management
          </p>
          <div className="mt-3 flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2 text-indigo-800 bg-indigo-100 px-3 py-1.5 rounded-md border-2 border-indigo-300 shadow-sm">
              <span className="font-semibold">START:</span>
              <span>(0, 0)</span>
            </div>
            <div className="flex items-center gap-2 text-green-800 bg-green-100 px-3 py-1.5 rounded-md border-2 border-green-300 shadow-sm">
              <span className="font-semibold">DESTINATION:</span>
              <span>(n-1, m-1)</span>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Visualization Area */}
          <div className="lg:col-span-2">
            <div className="bg-gradient-to-br from-white to-blue-50 rounded-xl shadow-lg border-2 border-blue-200 p-6">
              <GridVisualization
                grid={simulation.grid}
                rechargeStations={simulation.rechargeStations}
                path={simulation.path}
                currentStep={simulation.currentStep}
              />
            </div>
          </div>

          {/* Right: Control and Info Panel */}
          <div className="space-y-6">
            <SimulationInfo
              batteryLevel={simulation.batteryLevel}
              maxBattery={simulation.maxBattery}
              totalTime={simulation.totalTime}
              status={simulation.status}
            />

            <ControlPanel
              isRunning={simulation.isRunning}
              speed={simulation.speed}
              status={simulation.status}
              onPlay={handlePlay}
              onPause={handlePause}
              onReset={handleReset}
              onSpeedChange={handleSpeedChange}
              canPlay={simulation.path.length > 0 && simulation.currentStep < simulation.path.length - 1}
            />

            <InputPanel
              defaultInput={defaultInput}
              onRunSimulation={handleRunSimulation}
            />
          </div>
        </div>
      </div>
    </div>
  );
}