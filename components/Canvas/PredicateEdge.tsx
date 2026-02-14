'use client';

import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  getStraightPath,
  type EdgeProps,
} from '@xyflow/react';
import type { WordEdgeData } from '@/types';

export function PredicateEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  style,
  data,
}: EdgeProps) {
  const edgeData = (data || {}) as WordEdgeData;
  const edgeRole = edgeData.edgeRole === 'cross' ? 'cross' : 'tree';
  const predicate =
    typeof edgeData.predicate === 'string'
      ? edgeData.predicate
      : typeof edgeData.label === 'string'
        ? edgeData.label
        : '';
  const predicateReason = typeof edgeData.predicateReason === 'string' ? edgeData.predicateReason : '';

  const [edgePath, labelX, labelY] =
    edgeRole === 'cross'
      ? getBezierPath({ sourceX, sourceY, targetX, targetY })
      : getStraightPath({ sourceX, sourceY, targetX, targetY });

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={style} />
      {predicate && (
        <EdgeLabelRenderer>
          <div
            className="pointer-events-none absolute z-[6]"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
          >
            <div className="group relative pointer-events-auto select-none">
              <span
                className="
                  px-1.5 py-0.5 rounded
                  border border-[var(--node-border)]
                  bg-[var(--background)]/95 shadow-sm
                  text-[10px] leading-none text-[var(--primary)] font-serif
                "
              >
                {predicate}
              </span>
              {predicateReason && (
                <span
                  className="
                    absolute left-1/2 top-full mt-1 w-56 -translate-x-1/2
                    rounded-md border border-[var(--node-border)]
                    bg-[var(--node-bg)] px-2 py-1 shadow-lg
                    text-[11px] leading-relaxed text-[var(--primary)] font-serif
                    opacity-0 transition-opacity duration-150 pointer-events-none
                    group-hover:opacity-100
                  "
                >
                  {predicateReason}
                </span>
              )}
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
