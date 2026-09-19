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
  
  return (
    <div className="border border-amber-900/50 bg-amber-950/10 rounded-xl p-4 my-3 relative overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.5)] max-w-[800px]">
      <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
      
      <div className="flex items-start gap-3 mb-3">
        <div className="p-2 bg-amber-500/10 rounded-md text-amber-500 mt-1">
          <ShieldAlert size={20} />
        </div>
        <div className="flex-1">
          <h3 className="m-0 mb-1 text-lg font-medium text-gray-100">
            Terminal Execution Approval
          </h3>
          <p className="m-0 text-sm text-gray-400">
            The agent wants to execute a terminal command. Please review and approve it.
          </p>
        </div>
      </div>
      
      <div className="bg-black/50 border border-gray-800 rounded-lg p-3 mb-4 font-mono text-sm overflow-x-auto whitespace-pre-wrap text-slate-200">
        <span className="text-emerald-500 mr-2">$</span>
        <span>{cmd}</span>
      </div>
      
      <div className="flex justify-end gap-3">
        <button
          onClick={() => handleAction(false)}
          disabled={submitting}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-400 bg-[#050505] border border-gray-800 rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          <X size={16} />
          Reject
        </button>
        <button
          onClick={() => handleAction(true)}
          disabled={submitting}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-black bg-amber-500 rounded-lg hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all border-none"
        >
          {submitting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
          Approve & Run
        </button>
      </div>
    </div>
  );
}
