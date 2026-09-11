import type { ReactNode } from "react";

interface Column<T> {
  header: string;
  accessor: (row: T) => ReactNode;
}

interface TableProps<T> {
  columns: Column<T>[];
  rows: T[];
  keyFn: (row: T) => string;
  emptyLabel?: string;
}

export function Table<T>({ columns, rows, keyFn, emptyLabel = "No data" }: TableProps<T>) {
  if (rows.length === 0) {
    return <div className="table-empty">{emptyLabel}</div>;
  }

  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.header}>{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={keyFn(row)}>
              {columns.map((col) => (
                <td key={col.header}>{col.accessor(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
