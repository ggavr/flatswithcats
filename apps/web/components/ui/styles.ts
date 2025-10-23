import type { CSSProperties } from 'react';

export const cardStyle: CSSProperties = {
  background: 'rgba(15, 23, 42, 0.65)',
  borderRadius: 16,
  padding: 24,
  border: '1px solid rgba(148, 163, 184, 0.15)',
  marginBottom: 24,
  backdropFilter: 'blur(12px)'
};

export const labelStyle: CSSProperties = {
  display: 'block',
  fontSize: 14,
  fontWeight: 500,
  marginBottom: 6,
  color: '#bae6fd'
};

export const fieldStyle: CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid rgba(148, 163, 184, 0.3)',
  background: 'rgba(15, 23, 42, 0.35)',
  color: '#f8fafc',
  fontSize: 15,
  boxSizing: 'border-box'
};

export const textareaStyle: CSSProperties = {
  ...fieldStyle,
  minHeight: 96,
  resize: 'vertical'
};

export const buttonStyle: CSSProperties = {
  border: 'none',
  borderRadius: 12,
  padding: '12px 18px',
  fontSize: 15,
  fontWeight: 600,
  cursor: 'pointer',
  background: 'linear-gradient(135deg, #38bdf8, #6366f1)',
  color: '#0f172a',
  transition: 'transform 0.15s ease'
};

export const secondaryButtonStyle: CSSProperties = {
  ...buttonStyle,
  background: 'rgba(148, 163, 184, 0.2)',
  color: '#e2e8f0',
  border: '1px solid rgba(148, 163, 184, 0.35)'
};

export const successButtonStyle: CSSProperties = {
  ...buttonStyle,
  background: 'linear-gradient(135deg, #22c55e, #14b8a6)'
};

export const publishButtonStyle: CSSProperties = {
  ...buttonStyle,
  background: 'linear-gradient(135deg, #f97316, #ec4899)'
};
