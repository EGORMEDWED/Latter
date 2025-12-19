import React from 'react';

interface Column {
  key: string;
  label: string;
  render?: (row: any) => React.ReactNode;
}

interface TableProps {
  data: any[];
  columns: Column[];
  onRowClick?: (row: any) => void;
}

export const Table: React.FC<TableProps> = ({ data, columns, onRowClick }) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="text-xs uppercase bg-gray-100">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="px-6 py-3">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-6 py-4 text-center text-gray-500">
                No data found
              </td>
            </tr>
          ) : (
            data.map((row, index) => (
              <tr
                key={index}
                onClick={() => onRowClick?.(row)}
                className={`bg-white border-b hover:bg-gray-50 ${
                  onRowClick ? 'cursor-pointer' : ''
                }`}
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-6 py-4">
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};