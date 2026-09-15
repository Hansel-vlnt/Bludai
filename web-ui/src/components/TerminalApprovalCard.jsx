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
    <div style={{
      backgroundColor: 'var(--panel-bg)',
      border: '1px solid rgba(245, 158, 11, 0.3)',
      borderRadius: '8px',
      padding: '16px',
      margin: '16px 0',
      maxWidth: '800px',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '4px',
        height: '100%',
        backgroundColor: '#f59e0b'
      }}></div>
      
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
        <div style={{
          padding: '8px',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          borderRadius: '6px',
          color: '#f59e0b',
          marginTop: '4px'
        }}>
          <ShieldAlert size={20} />
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', fontWeight: 500, color: 'var(--text-primary)' }}>
            Terminal Execution Approval
          </h3>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            The agent wants to execute a terminal command. Please review and approve it.
          </p>
        </div>
      </div>
      
      <div style={{
        backgroundColor: 'rgba(0,0,0,0.5)',
        border: '1px solid var(--panel-border)',
        borderRadius: '4px',
        padding: '12px',
        marginBottom: '16px',
        fontFamily: 'monospace',
        fontSize: '0.9rem',
        overflowX: 'auto',
        whiteSpace: 'pre-wrap',
        color: '#e2e8f0'
      }}>
        <span style={{ color: '#10b981', marginRight: '8px' }}>$</span>
        <span>{cmd}</span>
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
        <button
          onClick={() => handleAction(false)}
          disabled={submitting}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            fontSize: '0.85rem',
            fontWeight: 500,
            color: 'var(--text-secondary)',
            backgroundColor: 'var(--input-bg)',
            border: '1px solid var(--panel-border)',
            borderRadius: '6px',
            cursor: submitting ? 'not-allowed' : 'pointer',
            opacity: submitting ? 0.5 : 1,
            transition: 'all 0.2s'
          }}
          onMouseOver={(e) => { if(!submitting) e.currentTarget.style.backgroundColor = 'var(--panel-border)'; }}
          onMouseOut={(e) => { if(!submitting) e.currentTarget.style.backgroundColor = 'var(--input-bg)'; }}
        >
          <X size={16} />
          Reject
        </button>
        <button
          onClick={() => handleAction(true)}
          disabled={submitting}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            fontSize: '0.85rem',
            fontWeight: 500,
            color: '#000',
            backgroundColor: '#f59e0b',
            border: 'none',
            borderRadius: '6px',
            cursor: submitting ? 'not-allowed' : 'pointer',
            opacity: submitting ? 0.5 : 1,
            transition: 'all 0.2s'
          }}
          onMouseOver={(e) => { if(!submitting) e.currentTarget.style.backgroundColor = '#fbbf24'; }}
          onMouseOut={(e) => { if(!submitting) e.currentTarget.style.backgroundColor = '#f59e0b'; }}
        >
          {submitting ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={16} />}
          Approve & Run
        </button>
      </div>
    </div>
  );
}
