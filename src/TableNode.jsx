import { useEffect, useState } from "react";
import { Handle, Position } from "reactflow";

function TableNode({ id, data, onAddColumn, onRenameTable, onRenameColumn, onChangeColumnType, onRemoveColumn, onAddRow, onSetPrimaryKey, onUpdateCell, onRemoveRow }) {
  const [newCol, setNewCol] = useState("");
  const [newRowValues, setNewRowValues] = useState(Array(data.columns.length).fill(""));
  const [error, setError] = useState("");

  // Keep input row length in sync with column count
  useEffect(() => {
    if (newRowValues.length !== data.columns.length) {
      const next = Array(data.columns.length).fill("");
      for (let i = 0; i < Math.min(newRowValues.length, next.length); i++) {
        next[i] = newRowValues[i];
      }
      setNewRowValues(next);
    }
  }, [data.columns.length, newRowValues.length]);

  const addColumn = () => {
    if (!newCol.trim()) return;
    onAddColumn(id, newCol.trim(), "TEXT");
    setNewCol("");
  };

  const handleRowInputChange = (colIndex, value) => {
    const updated = [...newRowValues];
    updated[colIndex] = value;
    setNewRowValues(updated);
  };

  const addRow = () => {
    // Local PK validation for immediate feedback
    const pkIndex = data.primaryKey ? data.columns.map((c) => c.name).indexOf(data.primaryKey) : -1;
    if (pkIndex >= 0) {
      const pkVal = (newRowValues[pkIndex] ?? "").trim();
      if (pkVal === "") {
        setError(`Primary key '${data.primaryKey}' cannot be empty.`);
        return;
      }
      const existing = (data.values[pkIndex] || []);
      if (existing.some((v) => String(v).trim() === pkVal)) {
        setError(`Duplicate primary key value '${pkVal}'.`);
        return;
      }
    }
    setError("");
    // Send entire row to parent for PK validation and insertion
    onAddRow(id, newRowValues);
    // Clear inputs for continuous entry
    setNewRowValues(Array(data.columns.length).fill(""));
  };

  return (
    <div
      style={{
        border: "1px solid #2f2f2f",
        borderRadius: 10,
        padding: 10,
        minWidth: Math.max(220, data.columns.length * 120),
        background: "#ffffff",
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: 12,
        boxShadow: "0 6px 16px rgba(0,0,0,0.15)",
      }}
    >
      {/* Table Name */}
      <input
        value={data.tableName}
        onChange={(e) => onRenameTable(id, e.target.value)}
        className="nodrag"
        style={{
          width: "100%",
          fontWeight: 700,
          textAlign: "center",
          fontSize: 14,
          marginBottom: 8,
          border: "none",
          borderBottom: "2px solid #e0e0e0",
          padding: 6,
          background: "#333",
          color: "#fff",
          borderRadius: 6,
        }}
      />

      {/* Primary Key selection */}
      {data.columns.length > 0 && (
        <div style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontWeight: 600, color: "#444" }}>Primary Key:</span>
          {data.columns.map((col, idx) => (
            <label key={idx} className="nodrag" style={{ marginRight: 8, fontSize: 12, color: "#333", cursor: "pointer" }}>
              <input
                type="radio"
                name={`primary-${id}`}
                checked={data.primaryKey === col.name}
                onChange={() => onSetPrimaryKey(id, col.name)}
                className="nodrag"
                style={{ marginRight: 6 }}
              />
              {col.name}
            </label>
          ))}
        </div>
      )}

      {error && (
        <div style={{
          marginBottom: 8,
          background: "#fdecea",
          color: "#b71c1c",
          border: "1px solid #f5c6cb",
          borderRadius: 6,
          padding: "6px 8px",
          fontSize: 12,
        }}>{error}</div>
      )}

      {/* Table Grid */}
      <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, marginBottom: 8 }}>
        <thead>
          <tr>
            {data.columns.map((col, idx) => (
              <th
                key={idx}
                style={{
                  border: "1px solid #e5e7eb",
                  padding: "6px 8px",
                  background: "#f8fafc",
                  color: "#374151",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input
                    value={col.name}
                    onChange={(e) => onRenameColumn(id, idx, e.target.value)}
                    className="nodrag"
                    style={{
                      width: "100%",
                      border: "none",
                      textAlign: "center",
                      fontSize: 12,
                      background: "transparent",
                      color: "#111827",
                    }}
                  />
                  <select
                    value={col.type}
                    onChange={(e) => onChangeColumnType(id, idx, e.target.value)}
                    className="nodrag"
                    style={{ fontSize: 11 }}
                  >
                    <option>TEXT</option>
                    <option>INTEGER</option>
                    <option>REAL</option>
                    <option>BOOLEAN</option>
                  </select>
                  <button onClick={() => onRemoveColumn(id, idx)} className="nodrag" style={{ fontSize: 11, padding: "2px 6px" }}>x</button>
                </div>
                {/* Per-column connection handles */}
                <div style={{ position: "relative", height: 0 }}>
                  <Handle id={`${id}:${col.name}:target`} type="target" position={Position.Left} style={{ top: 12 }} />
                  <Handle id={`${id}:${col.name}:source`} type="source" position={Position.Right} style={{ top: 12 }} />
                </div>
              </th>
            ))}
            {/* Extra header for delete button column */}
            {data.values?.[0]?.length > 0 && <th style={{ border: "1px solid #e5e7eb", background: "#f8fafc" }}></th>}
          </tr>
        </thead>
        <tbody>
          {data.columns.length === 0 ? (
            <tr>
              <td style={{ padding: 6, textAlign: "center", color: "#777" }}>
                Add a column to start entering rows.
              </td>
            </tr>
          ) : data.values && data.values[0] && data.values[0].length > 0
            ? Array.from({ length: data.values[0].length }).map((_, rowIdx) => (
              <tr key={rowIdx}>
                {data.columns.map((_, colIdx) => (
                  <td
                    key={colIdx}
                    style={{
                      border: "1px solid #e5e7eb",
                      padding: "6px 8px",
                      textAlign: "center",
                      fontSize: 12,
                      color: "#111827",
                    }}
                  >
                    <input
                      value={data.values[colIdx]?.[rowIdx] ?? ""}
                      onChange={(e) => onUpdateCell(id, rowIdx, colIdx, e.target.value)}
                      className="nodrag"
                      style={{ width: "100%", border: "none", textAlign: "center", background: "transparent" }}
                    />
                  </td>
                ))}
                <td style={{ border: "1px solid #e5e7eb", padding: 0 }}>
                  <button onClick={() => onRemoveRow(id, rowIdx)} className="nodrag" style={{ fontSize: 12, padding: "4px 8px", color: "#b91c1c" }}>Delete</button>
                </td>
              </tr>
            ))
            : null}
          {/* Row for adding new values */}
          {data.columns.length > 0 && (
            <tr>
              {data.columns.map((col, colIdx) => (
                <td key={colIdx} style={{ border: "1px solid #e5e7eb", padding: 0 }}>
                  <input
                    value={newRowValues[colIdx]}
                    placeholder={col.name}
                    onChange={(e) => handleRowInputChange(colIdx, e.target.value)}
                    className="nodrag"
                    style={{
                      width: "100%",
                      border: "none",
                      padding: "6px 8px",
                      fontSize: 12,
                      boxSizing: "border-box",
                      color: "#111827",
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addRow();
                      }
                    }}
                  />
                </td>
              ))}
            </tr>
          )}
        </tbody>
      </table>

      {/* Add Column and Add Row Buttons */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, alignItems: "center", gap: 8 }}>
        <div style={{ display: "flex", flex: 1, marginRight: 4 }}>
          <input
            type="text"
            value={newCol}
            placeholder="Add column"
            onChange={(e) => setNewCol(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addColumn(); }}
            className="nodrag"
            style={{ flex: 1, fontSize: 12, padding: "6px 8px", border: "1px solid #e5e7eb", borderRadius: 6 }}
          />
          <button onClick={addColumn} className="nodrag" style={{ marginLeft: 6, fontSize: 12, padding: "6px 10px", borderRadius: 6, background: "#111827", color: "#fff", border: "none", cursor: "pointer" }}>+
          </button>
        </div>
        <button onClick={addRow} className="nodrag" style={{ fontSize: 12, padding: "6px 12px", borderRadius: 6, background: "#2563eb", color: "#fff", border: "none", cursor: "pointer" }}>Add Row
        </button>
      </div>

      {/* React Flow Handles */}
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

export default TableNode;