import { ArrowRight, FileText, X } from 'lucide-react';
import { STAGES } from '../utils/format';

export function PageTitle({ eyebrow, title, subtitle, action }) {
  return (
    <div className="page-title">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {action && <div className="page-action">{action}</div>}
    </div>
  );
}

export function StatusBadge({ stage, text }) {
  const value = STAGES[stage] || { text: stage, tone: 'gray' };
  return <span className={`status-badge status-${value.tone}`}>
    <span className="status-dot" />{text || value.text}</span>;
}

export function Panel({ children, title, extra, className = '' }) {
  return (
    <section className={`panel ${className}`}>
      {title && <div className="panel-title">
        <h2>{title}</h2>{extra}</div>}
      {children}
    </section>
  );
}

export function EmptyState({ title = 'Sin registros', detail = 'No hay elementos disponibles.' }) {
  return <div className="empty-state">
    <FileText size={27} />
    <strong>{title}</strong>
    <span>{detail}</span>
  </div>;
}

export function Modal({ title, subtitle, onClose, children, footer }) {
  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="dialog" role="dialog" aria-modal="true" aria-label={title}>
        <div className="dialog-heading">
          <div>
            <h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>
          <button className="icon-button" onClick={onClose} aria-label="Cerrar">
            <X size={19} />
          </button>
        </div>
        <div className="dialog-content">{children}</div>
        {footer && <div className="dialog-footer">{footer}</div>}
      </section>
    </div>
  );
}

export function LinkButton({ children, onClick }) {
  return <button className="text-link" onClick={onClick}>{children}<ArrowRight size={14} />
  </button>;
}
