import React, { useState } from 'react';
import { Check, X, ShieldAlert, Loader2 } from 'lucide-react';

export default function TerminalApprovalCard({ interruptData, onRespond }) {
  const [submitting, setSubmitting] = useState(false);
  
  const handleAction = async (approved) => {
    setSubmitting(true);
    await onRespond(approved);
    setSubmitting(false);
  };
  
  const cmd = interruptData?.command || "Unknown command";
  const isDestructive = /\b(rm|rmdir|kill|pkill|del|erase|drop|truncate|format|sudo|npm un|git reset --hard)\b/i.test(cmd);

  return (
    <div className={`border ${isDestructive ? 'border-rose-500/30' : 'border-amber-500/30'} rounded-2xl p-5 my-4 relative overflow-hidden shadow-xl shadow-black/50 max-w-[800px] bg-[#14161d]`}>
      <div className={`absolute top-0 left-0 w-1.5 h-full ${isDestructive ? 'bg-rose-500' : 'bg-amber-500'}`}></div>
      
      <div className="flex items-start justify-between gap-3 mb-3.5">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-xl mt-0.5 ${isDestructive ? 'bg-rose-500/10 text-rose-400' : 'bg-amber-500/10 text-amber-400'}`}>
            <ShieldAlert size={20} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
              Terminal Execution Intervention
              {isDestructive ? (
                <span className="px-2 py-0.5 text-[10px] font-semibold uppercase rounded-md bg-rose-500/15 text-rose-400 border border-rose-500/30">
                  High Risk
                </span>
              ) : (
                <span className="px-2 py-0.5 text-[10px] font-semibold uppercase rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  Approval Required
                </span>
              )}
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              An agent requested permission to run a system command. Review before continuing.
            </p>
          </div>
        </div>
      </div>
      
      <div className="bg-[#161822] border border-white/[0.08] rounded-xl p-3.5 mb-4 font-mono text-xs overflow-x-auto whitespace-pre-wrap text-zinc-200">
        <span className="text-emerald-400 font-bold mr-2 select-none">$</span>
        <span>{cmd}</span>
      </div>
      
      <div className="flex items-center justify-end gap-3">
        <button
          onClick={() => handleAction(false)}
          disabled={submitting}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-zinc-300 bg-white/[0.04] border border-white/[0.08] rounded-xl hover:bg-white/[0.08] hover:text-rose-400 hover:border-rose-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
        >
          <X size={15} />
          Reject
        </button>
        <button
          onClick={() => handleAction(true)}
          disabled={submitting}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer ${
            isDestructive 
              ? 'bg-rose-600 hover:bg-rose-500 text-white' 
              : 'bg-zinc-200 hover:bg-white text-zinc-950'
          }`}
        >
          {submitting ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} strokeWidth={2.5} />}
          Approve &amp; Run
        </button>
      </div>
    </div>
  );
}
