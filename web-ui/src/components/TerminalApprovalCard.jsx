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
    <div className={`border ${isDestructive ? 'border-[#f38ba8]/60 bg-[#f38ba8]/5' : 'border-[#f9e2af]/50 bg-[#f9e2af]/5'} rounded-2xl p-5 my-4 relative overflow-hidden shadow-xl shadow-black/50 max-w-[800px] bg-[#222336]`}>
      <div className={`absolute top-0 left-0 w-1.5 h-full ${isDestructive ? 'bg-[#f38ba8]' : 'bg-[#f9e2af]'}`}></div>
      
      <div className="flex items-start justify-between gap-3 mb-3.5">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-xl mt-0.5 ${isDestructive ? 'bg-[#f38ba8]/15 text-[#f38ba8]' : 'bg-[#f9e2af]/15 text-[#f9e2af]'}`}>
            <ShieldAlert size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#cdd6f4] flex items-center gap-2">
              Terminal Execution Intervention
              {isDestructive ? (
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-[#f38ba8]/20 text-[#f38ba8] border border-[#f38ba8]/40">
                  High Risk
                </span>
              ) : (
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-[#f9e2af]/20 text-[#f9e2af] border border-[#f9e2af]/40">
                  Approval Required
                </span>
              )}
            </h3>
            <p className="text-xs text-[#a6adc8] mt-0.5">
              An agent requested permission to run a system command. Review before continuing.
            </p>
          </div>
        </div>
      </div>
      
      <div className="bg-[#141420] border border-[#2d2e42] rounded-xl p-3.5 mb-4 font-mono text-xs overflow-x-auto whitespace-pre-wrap text-[#cdd6f4] shadow-inner">
        <span className="text-[#a6e3a1] font-bold mr-2 select-none">$</span>
        <span>{cmd}</span>
      </div>
      
      <div className="flex items-center justify-end gap-3">
        <button
          onClick={() => handleAction(false)}
          disabled={submitting}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-[#a6adc8] bg-[#1a1b28] border border-[#383a54] rounded-xl hover:bg-[#2d2e42] hover:text-[#f38ba8] hover:border-[#f38ba8]/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
        >
          <X size={15} />
          Reject
        </button>
        <button
          onClick={() => handleAction(true)}
          disabled={submitting}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold text-[#11111b] rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer ${
            isDestructive 
              ? 'bg-[#f38ba8] hover:bg-[#eba0ac] shadow-[0_0_15px_rgba(243,139,168,0.3)]' 
              : 'bg-[#a6e3a1] hover:bg-[#94e2d5] shadow-[0_0_15px_rgba(166,227,161,0.3)]'
          }`}
        >
          {submitting ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} strokeWidth={2.5} />}
          Approve &amp; Run
        </button>
      </div>
    </div>
  );
}
