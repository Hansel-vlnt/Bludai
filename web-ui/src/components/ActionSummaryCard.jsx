import React from 'react';
import { Layers } from 'lucide-react';

/**
 * ActionSummaryCard — Diff-style action summary card for orchestration results.
 * Unified Dark Slate palette.
 */
export default function ActionSummaryCard({ 
  title = "Orchestration Plan & Summary", 
  chip = "Completed", 
  items = [] 
}) {
  return (
    <div className="my-3.5 bg-[#14161d] border border-white/[0.08] rounded-2xl p-4 shadow-lg shadow-black/40 text-left">
      <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-white/[0.08]">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-white/5 text-zinc-300">
            <Layers size={14} />
          </div>
          <h4 className="text-xs font-semibold text-zinc-100 uppercase tracking-wider">{title}</h4>
        </div>
        <span className="px-2.5 py-0.5 text-[10px] font-medium uppercase rounded-full bg-white/5 text-zinc-300 border border-white/[0.08]">
          {chip}
        </span>
      </div>
      
      {items && items.length > 0 && (
        <ul className="space-y-2 text-xs text-zinc-400">
          {items.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2.5 leading-relaxed">
              <span className="text-zinc-500 mt-1 shrink-0 font-bold">&bull;</span>
              <div className="flex-1 min-w-0 text-zinc-200">
                {React.isValidElement(item) ? item : (typeof item === 'object' && item?.text ? item.text : item)}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
