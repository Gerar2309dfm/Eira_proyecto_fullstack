import { ChevronRight } from 'lucide-react';
import { EmptyState, StatusBadge } from './Ui';
import { formatDate, initials } from '../utils/format';

export default function ResultTable({ results, selected, onSelect }) {
  if (!results.length) return <EmptyState detail="Prueba con otro filtro o registra un documento." />;

  return (
    <div className="table-scroll">
      <table className="data-table">
        <thead>
          <tr>
            <th>PACIENTE</th>
            <th>FOLIO</th>
            <th>FECHA</th>
            <th>ESTADO</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {results.map((result) => (
            <tr key={result.id} className={selected === result.id ? 'is-selected' : ''} onClick={() => onSelect(result.id)}>
              <td>
                <div className="patient-cell">
                  <div className="avatar-soft">{initials(result.patientName)}</div>
                  <div>
                    <strong>{result.patientName}</strong>
                    <small>{result.type}</small>
                  </div>
                </div>
              </td>
              <td>
                <span className="mono">{result.id}</span>
              </td>
              <td>{formatDate(result.createdAt)}</td>
              <td>
                <StatusBadge stage={result.stage} />
              </td>
              <td>
                <ChevronRight size={16} color="#8296a0" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
