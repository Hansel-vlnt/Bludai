import React from 'react';
import { Thermometer } from 'lucide-react';

const TemperatureSlider = ({ temperature, setTemperature }) => {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-[#0a0a0a] border border-gray-800 rounded-lg hover:border-gray-700 transition-colors">
      <Thermometer size={14} className="text-gray-500" />
      <span className="text-xs font-medium text-gray-300 w-16">Temp: {temperature.toFixed(1)}</span>
      <input 
        type="range" 
        min="0.0" 
        max="1.5" 
        step="0.1" 
        value={temperature}
        onChange={(e) => setTemperature(parseFloat(e.target.value))}
        className="w-24 h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-cyan-500 hover:accent-cyan-400 transition-all"
      />
    </div>
  );
};

export default TemperatureSlider;
