'use client';

import { useEffect, useState, useCallback } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';

interface GraphNode {
  id: number;
  name_ar: string;
  name_en?: string;
  reliability?: string;
  role: 'center' | 'teacher' | 'student';
}

interface GraphEdge {
  source: number;
  target: number;
}

interface Props {
  narratorId: number;
}

const ROLE_COLORS = {
  center:  '#059669', // emerald-600
  teacher: '#3b82f6', // blue-500
  student: '#a855f7', // purple-500
};

function buildLayout(rawNodes: GraphNode[], rawEdges: GraphEdge[]) {
  const CARD_W = 160;
  const CARD_H = 60;

  // Separate by role
  const teachers = rawNodes.filter((n) => n.role === 'teacher');
  const center   = rawNodes.find((n) => n.role === 'center')!;
  const students  = rawNodes.filter((n) => n.role === 'student');

  const nodes: Node[] = [];
  const COL_GAP = 220;
  const ROW_GAP = 80;

  // Teachers on left
  teachers.forEach((n, i) => {
    nodes.push({
      id: String(n.id),
      data: { label: n.name_en ?? n.name_ar, sublabel: n.role },
      position: { x: 0, y: i * ROW_GAP - ((teachers.length - 1) * ROW_GAP) / 2 },
      style: { background: ROLE_COLORS.teacher, color: '#fff', borderRadius: 8, border: 'none', width: CARD_W, height: CARD_H, fontSize: 11 },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    });
  });

  // Center
  if (center) {
    nodes.push({
      id: String(center.id),
      data: { label: center.name_en ?? center.name_ar, sublabel: 'narrator' },
      position: { x: COL_GAP, y: 0 },
      style: { background: ROLE_COLORS.center, color: '#fff', borderRadius: 8, border: '3px solid #fff', width: CARD_W, height: CARD_H, fontSize: 12, fontWeight: 700 },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    });
  }

  // Students on right
  students.forEach((n, i) => {
    nodes.push({
      id: String(n.id),
      data: { label: n.name_en ?? n.name_ar, sublabel: n.role },
      position: { x: COL_GAP * 2, y: i * ROW_GAP - ((students.length - 1) * ROW_GAP) / 2 },
      style: { background: ROLE_COLORS.student, color: '#fff', borderRadius: 8, border: 'none', width: CARD_W, height: CARD_H, fontSize: 11 },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    });
  });

  const edges: Edge[] = rawEdges.map((e, i) => ({
    id: `e${i}`,
    source: String(e.source),
    target: String(e.target),
    animated: true,
    style: { stroke: '#6b7280' },
  }));

  return { nodes, edges };
}

export default function NarratorGraph({ narratorId }: Props) {
  const [rfNodes, setRfNodes, onNodesChange] = useNodesState([]);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const loadGraph = useCallback(async () => {
    try {
      const res = await fetch(`/api/narrators/${narratorId}/graph`);
      if (!res.ok) throw new Error('Failed');
      const { nodes, edges } = await res.json();
      const { nodes: rfN, edges: rfE } = buildLayout(nodes, edges);
      setRfNodes(rfN);
      setRfEdges(rfE);
    } catch {
      setError('Failed to load graph.');
    } finally {
      setLoading(false);
    }
  }, [narratorId, setRfNodes, setRfEdges]);

  useEffect(() => { loadGraph(); }, [loadGraph]);

  if (loading) return <div className="h-80 flex items-center justify-center text-gray-400">Loading graph…</div>;
  if (error)   return <div className="h-80 flex items-center justify-center text-red-400">{error}</div>;

  return (
    <div className="h-96 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        attributionPosition="bottom-right"
      >
        <Background color="#e5e7eb" gap={16} />
        <Controls />
        <MiniMap nodeColor={(n) => n.style?.background as string ?? '#ccc'} />
      </ReactFlow>

      {/* Legend */}
      <div className="flex gap-4 p-2 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 text-xs">
        {Object.entries(ROLE_COLORS).map(([role, color]) => (
          <span key={role} className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm inline-block" style={{ background: color }} />
            {role.charAt(0).toUpperCase() + role.slice(1)}
          </span>
        ))}
      </div>
    </div>
  );
}
