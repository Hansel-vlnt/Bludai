import React from 'react';
import { Thermometer } from 'lucide-react';

const TemperatureSlider = ({ temperature, setTemperature }) => {
  return (
    <div className="temp-slider-container">
      <Thermometer size={14} className="temp-icon" />
      <span className="temp-label">Temp: {temperature.toFixed(1)}</span>
      <input 
        type="range" 
        min="0.0" 
        max="1.5" 
        step="0.1" 
        value={temperature}
        onChange={(e) => setTemperature(parseFloat(e.target.value))}
        className="terminal-slider"
      />
    </div>
  );
};

export default TemperatureSlider;
