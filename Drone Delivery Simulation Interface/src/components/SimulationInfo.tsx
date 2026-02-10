import React from 'react';
import { Battery, Clock, Activity } from 'lucide-react';

interface SimulationInfoProps {
  batteryLevel: number;
  maxBattery: number;
  totalTime: number;
  status: 'idle' | 'ready' | 'running' | 'paused' | 'completed' | 'unreachable';
}

export function SimulationInfo({ batteryLevel, maxBattery, totalTime, status }: SimulationInfoProps) {
  const getBatteryColor = () => {
    const percentage = (batteryLevel / maxBattery) * 100;
    if (percentage > 60) return 'bg-green-500';
    if (percentage > 30) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getStatusColor = () => {
    switch (status) {
      case 'ready':
        return 'text-indigo-600 bg-indigo-50 border border-indigo-200';
      case 'running':
        return 'text-blue-600 bg-blue-50 border border-blue-200';
      case 'paused':
        return 'text-yellow-600 bg-yellow-50 border border-yellow-200';
      case 'completed':
        return 'text-green-600 bg-green-50 border border-green-200';
      case 'unreachable':
        return 'text-red-600 bg-red-50 border border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border border-gray-200';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'ready':
        return 'Ready';
      case 'running':
        return 'Running';
      case 'paused':
        return 'Paused';
      case 'completed':
        return 'Completed';
      case 'unreachable':
        return 'Unreachable';
      default:
        return 'Idle';
    }
  };

  const batteryPercentage = (batteryLevel / maxBattery) * 100;

  return (
    <div className="bg-gradient-to-br from-white to-indigo-50 rounded-xl shadow-lg border-2 border-indigo-200 p-6">
      <h2 className="text-lg font-semibold text-indigo-900 mb-4">Simulation Info</h2>
      
      <div className="space-y-4">
        {/* Status */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-600" />
              <span className="text-sm font-medium text-gray-800">Status</span>
            </div>
          </div>
          <div className="flex items-center">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor()}`}>
              {getStatusText()}
            </span>
          </div>
        </div>

        {/* Battery Level */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Battery className="w-4 h-4 text-indigo-600" />
              <span className="text-sm font-medium text-gray-800">Battery</span>
            </div>
            <span className="text-sm font-semibold text-gray-900">
              {batteryLevel} / {maxBattery}
            </span>
          </div>
          <div className="w-full bg-gray-300 rounded-full h-3 overflow-hidden shadow-inner">
            <div
              className={`h-full transition-all duration-300 ${getBatteryColor()}`}
              style={{ width: `${batteryPercentage}%` }}
            />
          </div>
        </div>

        {/* Total Time */}
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600" />
              <span className="text-sm font-medium text-gray-800">Total Time</span>
            </div>
            <span className="text-sm font-semibold text-gray-900">{totalTime}s</span>
          </div>
        </div>
      </div>
    </div>
  );
}