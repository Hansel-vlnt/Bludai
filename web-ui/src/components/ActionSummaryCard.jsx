import React from 'react';
import { Layers, CheckCircle2, ArrowRight } from 'lucide-react';

/**
 * ActionSummaryCard — Diff-style action summary card for orchestration results.
 * Follows Antigravity structural rules while strictly adhering to Bludai's
 * Catppuccin Mocha elevation tokens and single accent (#cba6f7).
 */
export default function ActionSummaryCard({ 
  title = "Orchestration Plan & Summary", 
  chip = "Completed", 
  items = [] 
}) {
  return (
    <div className="my-3.5 bg-[#222336] border border-[#383a54] rounded-2xl p-4 shadow-lg shadow-black/40 text-left">
      <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-[#2d2e42]">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[#cba6f7]/15 text-[#cba6f7]">
            <Layers size={14} />
          </div>
          <h4 className="text-xs font-bold text-[#cdd6f4] uppercase tracking-wider">{title}</h4>
        </div>
        <span className="px-2.5 py-0.5 text-[10px] font-semibold uppercase rounded-full bg-[#cba6f7]/15 text-[#cba6f7] border border-[#cba6f7]/30">
          {chip}
        </span>
      </div>
      
      {items && items.length > 0 && (
        <ul className="space-y-2 text-xs text-[#a6adc8]">
          {items.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2.5 leading-relaxed">
              <span className="text-[#cba6f7] mt-1 shrink-0 font-bold">&bull;</span>
              <div className="flex-1 min-w-0 text-[#cdd6f4]">
                {React.isValidElement(item) ? item : (typeof item === 'object' && item?.text ? item.text : item)}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
