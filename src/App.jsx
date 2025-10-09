import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import ReactFlow, {
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  MiniMap,
  Controls,
  Background,
} from "reactflow";
import "reactflow/dist/style.css";
import TableNode from "./TableNode";
import { toPng } from "html-to-image";
import mermaid from "mermaid";

function App() {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [newTableName, setNewTableName] = useState("");
  const [newColumns, setNewColumns] = useState([{ name: "", type: "TEXT" }]);
  const [modalPrimaryKey, setModalPrimaryKey] = useState("");
  const [showSQL, setShowSQL] = useState(false);
  const [showERD, setShowERD] = useState(false);
  // Ref to capture the diagram for PNG export
  const diagramRef = useRef(null);
  const mermaidRef = useRef(null);

  // Initialize Mermaid
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      er: {
        fontSize: 12
      },
      securityLevel: 'loose'
    });
  }, []);


  // Callbacks for TableNode actions
  const handleAddColumn = useCallback((nodeId, colName, colType = "TEXT") => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === nodeId
          ? { ...n, data: { ...n.data, columns: [...n.data.columns, { name: colName, type: colType }], values: [...n.data.values, []] } }
          : n
      )
    );
  }, []);

  const handleRenameTable = useCallback((nodeId, name) => {
    setNodes((nds) =>
      nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, tableName: name } } : n))
    );
  }, []);

  const handleRenameColumn = useCallback((nodeId, idx, newName) => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === nodeId
          ? { ...n, data: { ...n.data, columns: n.data.columns.map((c, i) => (i === idx ? { ...c, name: newName } : c)) } }
          : n
      )
    );
  }, []);

  const handleChangeColumnType = useCallback((nodeId, idx, newType) => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === nodeId
          ? { ...n, data: { ...n.data, columns: n.data.columns.map((c, i) => (i === idx ? { ...c, type: newType } : c)) } }
          : n
      )
    );
  }, []);

  const handleRemoveColumn = useCallback((nodeId, idx) => {
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id !== nodeId) return n;
        const colName = n.data.columns[idx]?.name;
        const nextCols = n.data.columns.filter((_, i) => i !== idx);
        const nextVals = n.data.values.filter((_, i) => i !== idx);
        const nextPK = n.data.primaryKey === colName ? "" : n.data.primaryKey;
        return { ...n, data: { ...n.data, columns: nextCols, values: nextVals, primaryKey: nextPK } };
      })
    );
  }, []);

  const handleAddValue = useCallback((nodeId, colIndex, value) => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === nodeId
          ? {
              ...n,
              data: {
                ...n.data,
                values: n.data.values.map((vals, i) => (i === colIndex ? [...vals, value] : vals)),
              },
            }
          : n
      )
    );
  }, []);

  // New: add a full row at once, enforcing primary key non-null and uniqueness
  const handleAddRow = useCallback((nodeId, rowValues) => {
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id !== nodeId) return n;

        // Ensure values structure matches columns
        let values = n.data.values || [];
        const columns = n.data.columns.map((c) => c.name);
        if (values.length !== columns.length) {
          values = columns.map((_, idx) => (values[idx] ? values[idx] : []));
        }
        const primaryKey = n.data.primaryKey;
        const pkIndex = primaryKey ? columns.indexOf(primaryKey) : -1;

        // Normalize row values length to number of columns
        const normalizedRow = columns.map((_, idx) => {
          const v = rowValues[idx];
          return v === undefined || v === null ? "" : String(v);
        });

        // If all values are empty and no PK set, ignore
        const allEmpty = normalizedRow.every((v) => v.trim() === "");
        if (pkIndex < 0 && allEmpty) {
          return n;
        }

        // PK validation: non-null and unique
        if (pkIndex >= 0) {
          const pkValue = normalizedRow[pkIndex];
          if (pkValue === undefined || pkValue === null || String(pkValue).trim() === "") {
            alert(`Primary key '${primaryKey}' cannot be empty.`);
            return n;
          }
          const existing = (n.data.values[pkIndex] || []);
          if (existing.some((v) => String(v).trim() === String(pkValue).trim())) {
            alert(`Duplicate primary key value '${pkValue}' in column '${primaryKey}'.`);
            return n;
          }
        }

        const nextValues = values.map((colValues, idx) => {
          const incoming = normalizedRow[idx];
          return [...colValues, incoming];
        });

        return { ...n, data: { ...n.data, values: nextValues } };
      })
    );
  }, []);

  const handleUpdateCell = useCallback((nodeId, rowIdx, colIdx, value) => {
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id !== nodeId) return n;
        const col = n.data.columns[colIdx];
        const val = String(value ?? "");
        // basic type checks; silently ignore invalid
        const trimmed = val.trim();
        if (trimmed !== "") {
          if (col.type === "INTEGER" && !/^\-?\d+$/.test(trimmed)) return n;
          if (col.type === "REAL" && isNaN(Number(trimmed))) return n;
          if (col.type === "BOOLEAN") {
            const lower = trimmed.toLowerCase();
            const ok = ["true","false","1","0","yes","no"].includes(lower);
            if (!ok) return n;
          }
        }
        const nextValues = n.data.values.map((colValues, idx) => {
          if (idx !== colIdx) return colValues;
          const copy = [...colValues];
          copy[rowIdx] = val;
          return copy;
        });
        return { ...n, data: { ...n.data, values: nextValues } };
      })
    );
  }, []);

  const handleRemoveRow = useCallback((nodeId, rowIdx) => {
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id !== nodeId) return n;
        const nextValues = n.data.values.map((colValues) => colValues.filter((_, i) => i !== rowIdx));
        return { ...n, data: { ...n.data, values: nextValues } };
      })
    );
  }, []);

  const handleSetPrimaryKey = useCallback((nodeId, colName) => {
    setNodes((nds) =>
      nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, primaryKey: colName } } : n))
    );
  }, []);

  // Foreign keys: store on the child (target) table
  const addForeignKey = useCallback((childId, childCol, parentId, parentCol) => {
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id !== childId) return n;
        const fks = n.data.foreignKeys || [];
        const next = [...fks, { column: childCol, refTableId: parentId, refColumn: parentCol }];
        return { ...n, data: { ...n.data, foreignKeys: next } };
      })
    );
  }, []);

  // Helper for getting table name from id
  const tableIdToName = useMemo(() => {
    const map = new Map();
    nodes.forEach((n) => map.set(n.id, n.data.tableName));
    return map;
  }, [nodes]);

  const toBooleanSQL = (v) => {
    const lower = String(v).toLowerCase();
    if (["true","1","yes"].includes(lower)) return "TRUE";
    if (["false","0","no"].includes(lower)) return "FALSE";
    return "NULL";
  };

  // SQL generator
  const generateSQL = () => {
    return nodes
      .map((n) => {
        const tableName = n.data.tableName;
        const columns = n.data.columns; // [{name,type}]
        const primaryKey = n.data.primaryKey;
        const foreignKeys = n.data.foreignKeys || [];

        const colsSQL = columns
          .map((c) => `  ${c.name} ${c.type}${primaryKey === c.name ? " PRIMARY KEY" : ""}`)
          .join(",\n");

        const fksSQL = foreignKeys
          .map((fk) => {
            const refTableName = tableIdToName.get(fk.refTableId) || fk.refTableId;
            return `  FOREIGN KEY (${fk.column}) REFERENCES ${refTableName}(${fk.refColumn})`;
          })
          .join(",\n");

        const constraints = fksSQL ? `,\n${fksSQL}` : "";

        const columnNames = columns.map((c) => c.name);
        const valuesSQL = [];
        const maxRows = Math.max(...n.data.values.map((v) => v.length), 0);
        for (let i = 0; i < maxRows; i++) {
          const row = columns.map((c, idx) => {
            const cell = n.data.values[idx][i];
            if (cell === undefined || cell === "") return "NULL";
            if (c.type === "INTEGER" || c.type === "REAL") return String(cell);
            if (c.type === "BOOLEAN") return toBooleanSQL(cell);
            return `'${String(cell).replace(/'/g, "''")}'`;
          });
          valuesSQL.push(`INSERT INTO ${tableName} (${columnNames.join(", ")}) VALUES (${row.join(", ")});`);
        }

        return `CREATE TABLE ${tableName} (\n${colsSQL}${constraints}\n);\n${valuesSQL.join("\n")}`;
      })
      .join("\n\n");
  };

  // Mermaid ERD generator
  const generateMermaidERD = () => {
    if (nodes.length === 0) {
      return "erDiagram\n  No tables found";
    }

    const header = "erDiagram";
    const lines = [header];

    // Entities with attributes
    nodes.forEach((n) => {
      const tableName = (n.data.tableName || n.id).replace(/[^a-zA-Z0-9_]/g, '_');
      const cols = n.data.columns || [];
      const pk = n.data.primaryKey || "";
      
      if (cols.length === 0) {
        lines.push(`${tableName} {\n  empty\n}`);
        return;
      }
      
      const attrs = cols
        .map((c) => {
          const type = c.type || "TEXT";
          const name = (c.name || "").replace(/[^a-zA-Z0-9_]/g, '_');
          const pkFlag = pk === c.name ? " PK" : "";
          return `  ${type} ${name}${pkFlag}`;
        })
        .join("\n");
      
      lines.push(`${tableName} {`);
      lines.push(attrs);
      lines.push("}");
    });

    // Relationships from foreign keys (parent ||--|| child)
    const idToNode = new Map(nodes.map((n) => [n.id, n]));
    nodes.forEach((child) => {
      const fks = child.data.foreignKeys || [];
      fks.forEach((fk) => {
        const parent = idToNode.get(fk.refTableId);
        const parentName = parent ? (parent.data.tableName || parent.id).replace(/[^a-zA-Z0-9_]/g, '_') : fk.refTableId;
        const childName = (child.data.tableName || child.id).replace(/[^a-zA-Z0-9_]/g, '_');
        const label = fk.column === fk.refColumn ? fk.column : `${fk.column} to ${fk.refColumn}`;
        // Use correct Mermaid ERD relationship syntax
        // ||--|| means one-to-many relationship (parent has many children)
        lines.push(`${parentName} ||--|| ${childName} : "${label}"`);
      });
    });

    return lines.join("\n");
  };

  // Export PNG of the current diagram
  const exportDiagramPng = async () => {
    try {
      const element = diagramRef.current;
      if (!element) return;
      const dataUrl = await toPng(element, { backgroundColor: "#ffffff", pixelRatio: 2 });
      const link = document.createElement("a");
      link.download = "er-diagram.png";
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error(err);
      alert("Failed to export PNG");
    }
  };

  // Render Mermaid ERD diagram
  const renderMermaidDiagram = useCallback(async () => {
    if (!mermaidRef.current) return;
    
    try {
      const erdText = generateMermaidERD();
      const element = mermaidRef.current;
      
      // Clear previous diagram
      element.innerHTML = '';
      element.removeAttribute('data-processed');
      
      // Generate unique ID for this diagram
      const diagramId = `mermaid-erd-${Date.now()}`;
      
      // Render new diagram
      const { svg } = await mermaid.render(diagramId, erdText);
      element.innerHTML = svg;
    } catch (err) {
      console.error('Failed to render Mermaid diagram:', err);
      console.error('ERD Text:', generateMermaidERD());
      mermaidRef.current.innerHTML = `<div style="color: red; padding: 20px;">
        <h4>Failed to render diagram</h4>
        <p>Error: ${err.message}</p>
        <details>
          <summary>ERD Text:</summary>
          <pre style="background: #f5f5f5; padding: 10px; margin: 10px 0;">${generateMermaidERD()}</pre>
        </details>
      </div>`;
    }
  }, [nodes, edges]);

  // Re-render diagram when modal opens
  useEffect(() => {
    if (showERD) {
      setTimeout(renderMermaidDiagram, 100);
    }
  }, [showERD, renderMermaidDiagram]);

  // React Flow node types
  const nodeTypes = useMemo(() => {
    return {
      tableNode: (props) => (
        <TableNode
          {...props}
          onAddColumn={handleAddColumn}
          onRenameTable={handleRenameTable}
          onRenameColumn={handleRenameColumn}
          onChangeColumnType={handleChangeColumnType}
          onRemoveColumn={handleRemoveColumn}
          onAddValue={handleAddValue}
          onAddRow={handleAddRow}
          onSetPrimaryKey={handleSetPrimaryKey}
          onUpdateCell={handleUpdateCell}
          onRemoveRow={handleRemoveRow}
        />
      ),
    };
  }, [
    handleAddColumn,
    handleRenameTable,
    handleRenameColumn,
    handleChangeColumnType,
    handleRemoveColumn,
    handleAddValue,
    handleAddRow,
    handleSetPrimaryKey,
    handleUpdateCell,
    handleRemoveRow,
  ]);

  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );
  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );
  const onConnect = useCallback(
    (params) => {
      const edge = { ...params, animated: true };
      setEdges((eds) => addEdge(edge, eds));
      // Expect handle ids in format `${tableId}:${columnName}`
      const [sTable, sCol] = (params.sourceHandle || '').split(":");
      const [tTable, tCol] = (params.targetHandle || '').split(":");
      if (params.source && params.target && sCol && tCol) {
        // Make target the child referencing source
        addForeignKey(params.target, tCol, params.source, sCol);
      }
    },
    []
  );

  return (
    <div className="w-screen h-screen">
      {/* Toolbar */}
      <div className="absolute top-3 left-3 z-10 flex gap-2">
        <button
          onClick={() => {
            setNewTableName("");
            setNewColumns([{ name: "", type: "TEXT" }]);
            setModalPrimaryKey("");
            setShowModal(true);
          }}
          className="px-3 py-2 rounded bg-blue-600 text-white shadow"
        >
          + Add Table
        </button>
        <button
          onClick={() => setShowSQL(true)}
          className="px-3 py-2 rounded bg-green-600 text-white shadow"
        >
          Export SQL
        </button>
        <button
          onClick={() => setShowERD(true)}
          className="px-3 py-2 rounded bg-purple-600 text-white shadow"
        >
          ERD (Mermaid)
        </button>
        <button
          onClick={exportDiagramPng}
          className="px-3 py-2 rounded bg-emerald-600 text-white shadow"
        >
          Download PNG
        </button>
      </div>

      {/* Modal for adding table */}
      {showModal && (
        <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl p-4 w-[420px]">
            <h3 className="text-lg font-semibold mb-3">Add Table</h3>
            <input
              placeholder="Table Name"
              value={newTableName}
              onChange={(e) => setNewTableName(e.target.value)}
              className="w-full border rounded px-3 py-2 mb-3"
            />
            <div className="space-y-2">
              {newColumns.map((col, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    placeholder={`Column ${idx + 1}`}
                    value={col.name}
                    onChange={(e) => {
                      const newCols = [...newColumns];
                      newCols[idx] = { ...newCols[idx], name: e.target.value };
                      setNewColumns(newCols);
                      if (!newCols.some((c) => c.name === modalPrimaryKey)) setModalPrimaryKey("");
                    }}
                    className="flex-1 border rounded px-2 py-1"
                  />
                  <select
                    value={col.type}
                    onChange={(e) => {
                      const newCols = [...newColumns];
                      newCols[idx] = { ...newCols[idx], type: e.target.value };
                      setNewColumns(newCols);
                    }}
                    className="border rounded px-2 py-1"
                  >
                    <option>TEXT</option>
                    <option>INTEGER</option>
                    <option>REAL</option>
                    <option>BOOLEAN</option>
                  </select>
                  <button onClick={() => setNewColumns(newColumns.filter((_, i) => i !== idx))} className="px-2 py-1 text-sm rounded bg-gray-200">x</button>
                </div>
              ))}
              <button onClick={() => setNewColumns([...newColumns, { name: "", type: "TEXT" }])} className="mt-1 text-sm text-blue-700">+ Add Column</button>
            </div>

            <div className="mt-3">
              <label className="font-semibold mr-2">Primary Key:</label>
              <select
                value={modalPrimaryKey}
                onChange={(e) => setModalPrimaryKey(e.target.value)}
                className="border rounded px-2 py-1"
              >
                <option value="">None</option>
                {newColumns
                  .map((c) => c.name.trim())
                  .filter((c) => c !== "")
                  .map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
              </select>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setShowModal(false)} className="px-3 py-2 rounded bg-gray-200">Cancel</button>
              <button
                onClick={() => {
                  const cleanCols = newColumns.filter((c) => c.name.trim() !== "");
                  if (cleanCols.length === 0) {
                    alert("Please add at least one column.");
                    return;
                  }

                  const id = `${nodes.length + 1}`;
                  const newNode = {
                    id,
                    type: "tableNode",
                    position: { x: 100 + nodes.length * 20, y: 100 + nodes.length * 20 },
                    data: {
                      tableName: newTableName || `Table${nodes.length + 1}`,
                      columns: cleanCols.map((c) => ({ name: c.name.trim(), type: c.type })),
                      values: cleanCols.map(() => []),
                      primaryKey: modalPrimaryKey && cleanCols.some((c) => c.name === modalPrimaryKey) ? modalPrimaryKey : "",
                      foreignKeys: [],
                    },
                  };
                  setNodes([...nodes, newNode]);
                  setShowModal(false);
                }}
                className="px-3 py-2 rounded bg-blue-600 text-white"
              >
                Add Table
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SQL Modal */}
      {showSQL && (
        <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl p-4 w-[700px] max-h-[80vh] flex flex-col">
            <h3 className="text-lg font-semibold mb-3">Generated SQL</h3>
            <textarea className="flex-1 w-full border rounded p-3 font-mono text-sm" readOnly value={generateSQL()} />
            <div className="mt-3 flex justify-end gap-2">
              <button onClick={() => setShowSQL(false)} className="px-3 py-2 rounded bg-gray-200">Close</button>
              <button onClick={() => { navigator.clipboard.writeText(generateSQL()); }} className="px-3 py-2 rounded bg-emerald-600 text-white">Copy</button>
            </div>
          </div>
        </div>
      )}

      {/* ERD Modal (Visual + Mermaid text) */}
      {showERD && (
        <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl p-4 w-[900px] max-h-[90vh] flex flex-col">
            <h3 className="text-lg font-semibold mb-3">ER Diagram</h3>
            
            {/* Visual Diagram */}
            <div className="mb-4 p-4 border rounded bg-gray-50">
              <h4 className="text-sm font-medium mb-2">Visual Diagram:</h4>
              <div 
                ref={mermaidRef} 
                className="flex justify-center items-center min-h-[200px]"
                style={{ overflow: 'auto' }}
              />
              {nodes.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  <p>No tables found. Add some tables to see the ER diagram.</p>
                </div>
              )}
            </div>
            
            {/* Mermaid Text */}
            <div className="flex-1 flex flex-col">
              <h4 className="text-sm font-medium mb-2">Mermaid Code:</h4>
              <textarea 
                className="flex-1 w-full border rounded p-3 font-mono text-sm" 
                readOnly 
                value={generateMermaidERD()} 
              />
            </div>
            
            <div className="mt-3 flex justify-between">
              <button 
                onClick={renderMermaidDiagram} 
                className="px-3 py-2 rounded bg-blue-600 text-white"
              >
                Refresh Diagram
              </button>
              <div className="flex gap-2">
                <button onClick={() => setShowERD(false)} className="px-3 py-2 rounded bg-gray-200">Close</button>
                <button onClick={() => { navigator.clipboard.writeText(generateMermaidERD()); }} className="px-3 py-2 rounded bg-indigo-600 text-white">Copy Code</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* React Flow canvas */}
      <div ref={diagramRef} style={{ width: "100%", height: "100%" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
      >
        <MiniMap />
        <Controls />
        <Background />
      </ReactFlow>
      </div>
    </div>
  );
}

export default App;
