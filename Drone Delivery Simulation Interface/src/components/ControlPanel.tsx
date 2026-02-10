import React from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';

interface ControlPanelProps {
  isRunning: boolean;
  speed: number;
  status: 'idle' | 'ready' | 'running' | 'paused' | 'completed' | 'unreachable';
  onPlay: () => void;
  onPause: () => void;
  onReset: () => void;
  onSpeedChange: (speed: number) => void;
  canPlay: boolean;
}

export function ControlPanel({
  isRunning,
  speed,
  status,
  onPlay,
  onPause,
  onReset,
  onSpeedChange,
  canPlay,
}: ControlPanelProps) {
  const isCompleted = status === 'completed';
  const isIdle = status === 'idle';

  return (
    <div className="bg-gradient-to-br from-white to-purple-50 rounded-xl shadow-lg border-2 border-purple-200 p-6">
      <h2 className="text-lg font-semibold text-purple-900 mb-4">Controls</h2>
      
      <div className="space-y-4">
        {/* Playback Controls */}
        <div>
          <label className="block text-xs font-medium text-purple-700 uppercase tracking-wide mb-2">
            Playback
          </label>
          <div className="flex gap-2">
            <button
              onClick={onPlay}
              disabled={!canPlay || isRunning || isCompleted}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all shadow-md font-medium"
            >
              <Play className="w-4 h-4" />
              Play
            </button>
            
            <button
              onClick={onPause}
              disabled={!isRunning}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-lg hover:from-gray-700 hover:to-gray-800 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all shadow-md font-medium"
            >
              <Pause className="w-4 h-4" />
              Pause
            </button>
          </div>
        </div>

        {/* Reset Button */}
        <div>
          <button
            onClick={onReset}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 rounded-lg hover:from-purple-200 hover:to-purple-300 transition-all border-2 border-purple-300 shadow-md font-medium"
          >
            <RotateCcw className="w-4 h-4" />
            Reset to Start
          </button>
        </div>

        {/* Speed Control */}
        <div>
          <label className="block text-xs font-medium text-purple-700 uppercase tracking-wide mb-2">
            Animation Speed
          </label>
          <select
            value={speed}
            onChange={(e) => onSpeedChange(Number(e.target.value))}
            className="w-full px-3 py-2.5 border-2 border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white font-medium text-gray-700 shadow-sm"
          >
            <option value={0.5}>0.5× (Slow)</option>
            <option value={1}>1× (Normal)</option>
            <option value={2}>2× (Fast)</option>
            <option value={4}>4× (Very Fast)</option>
          </select>
        </div>
      </div>
    </div>
  );
}