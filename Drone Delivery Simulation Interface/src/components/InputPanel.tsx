import React, { useState } from 'react';
import { PlayCircle, Info, ChevronDown, ChevronUp } from 'lucide-react';

interface InputPanelProps {
  defaultInput: string;
  onRunSimulation: (input: string) => void;
}

export function InputPanel({ defaultInput, onRunSimulation }: InputPanelProps) {
  const [input, setInput] = useState(defaultInput);
  const [showHelp, setShowHelp] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleRun = () => {
    onRunSimulation(input);
    setIsExpanded(false); // Collapse after running
  };

  return (
    <div className="bg-gradient-to-br from-white to-green-50 rounded-xl shadow-lg border-2 border-green-200">
      {/* Header - Always Visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-green-50 transition-colors rounded-t-xl"
      >
        <h2 className="text-lg font-semibold text-green-900">Advanced Input</h2>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-green-600" />
        ) : (
          <ChevronDown className="w-5 h-5 text-green-600" />
        )}
      </button>

      {/* Collapsible Content */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t-2 border-green-200">
          <div className="flex items-center justify-between mb-3 mt-3">
            <p className="text-sm text-gray-700">Configure custom simulation parameters</p>
            <button
              onClick={() => setShowHelp(!showHelp)}
              className="text-green-600 hover:text-green-800 transition-colors"
            >
              <Info className="w-4 h-4" />
            </button>
          </div>

          {showHelp && (
            <div className="mb-4 p-3 bg-blue-50 border-2 border-blue-300 rounded-lg text-xs text-gray-700">
              <p className="font-semibold mb-1">Input Format:</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>Line 1: Grid dimensions (rows cols)</li>
                <li>Next rows: Grid heights (space-separated)</li>
                <li>Next line: Number of recharge stations</li>
                <li>Next lines: Station positions (x y)</li>
                <li>Next line: Number of path points</li>
                <li>Next lines: Path positions (x y)</li>
              </ul>
            </div>
          )}
          
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-full h-48 px-3 py-2 border-2 border-green-300 rounded-lg font-mono text-xs focus:outline-none focus:ring-2 focus:ring-green-500 resize-none bg-white shadow-inner"
            placeholder="Paste simulation input here..."
          />
          
          <button
            onClick={handleRun}
            className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all shadow-md font-medium"
          >
            <PlayCircle className="w-4 h-4" />
            Run Simulation
          </button>
        </div>
      )}
    </div>
  );
}