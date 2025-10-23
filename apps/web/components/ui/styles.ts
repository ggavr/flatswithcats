import type { CSSProperties } from 'react';

export const cardStyle: CSSProperties = {
  background: '#ffffff',
  borderRadius: 12,
  padding: 24,
  border: '1px solid #e4e4e7',
  boxShadow: '0 4px 12px rgba(15, 15, 15, 0.04)',
  marginBottom: 24
};

export const labelStyle: CSSProperties = {
  display: 'block',
  fontSize: 14,
  fontWeight: 500,
  marginBottom: 6,
  color: '#2f3437'
};

export const fieldStyle: CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid #d4d4d8',
  background: '#ffffff',
  color: '#1f2933',
  fontSize: 15,
  boxSizing: 'border-box'
};

export const textareaStyle: CSSProperties = {
  ...fieldStyle,
  minHeight: 96,
  resize: 'vertical'
};

const baseButton: CSSProperties = {
  borderRadius: 8,
  border: '1px solid #111827',
  padding: '10px 16px',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  background: '#111827',
  color: '#ffffff',
  transition: 'background 0.2s ease, color 0.2s ease, border 0.2s ease'
};

export const buttonStyle: CSSProperties = {
  ...baseButton
};

export const secondaryButtonStyle: CSSProperties = {
  ...baseButton,
  background: '#ffffff',
  color: '#111827',
  border: '1px solid #d4d4d8'
};

export const successButtonStyle: CSSProperties = {
  ...baseButton,
  background: '#0f7a6c',
  border: '1px solid #0f7a6c'
};

export const publishButtonStyle: CSSProperties = {
  ...baseButton,
  background: '#2563eb',
  border: '1px solid #2563eb'
};
