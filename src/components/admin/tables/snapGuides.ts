export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AlignmentSnapResult {
  x?: number;
  y?: number;
  verticalGuideX?: number;
  horizontalGuideY?: number;
}

/**
 * Compares `active`'s left/right/center edges against every `other` bound's
 * left/right/center on each axis independently, snapping to the closest
 * match within `threshold` (same units as the bounds — flow-space pixels,
 * already zoom-adjusted by the caller). Returns the snapped top-left
 * position for whichever axes matched, plus the flow-space coordinate of
 * the guide line to render for each matched axis.
 */
export function computeAlignmentSnap(active: Bounds, others: Bounds[], threshold: number): AlignmentSnapResult {
  const activeAnchorsX = [
    { value: active.x, offset: 0 },
    { value: active.x + active.width, offset: active.width },
    { value: active.x + active.width / 2, offset: active.width / 2 }
  ];
  const activeAnchorsY = [
    { value: active.y, offset: 0 },
    { value: active.y + active.height, offset: active.height },
    { value: active.y + active.height / 2, offset: active.height / 2 }
  ];

  let bestX: { diff: number; snapped: number; guide: number } | null = null;
  let bestY: { diff: number; snapped: number; guide: number } | null = null;

  for (const other of others) {
    const otherAnchorsX = [other.x, other.x + other.width, other.x + other.width / 2];
    const otherAnchorsY = [other.y, other.y + other.height, other.y + other.height / 2];

    for (const anchor of activeAnchorsX) {
      for (const otherX of otherAnchorsX) {
        const diff = Math.abs(anchor.value - otherX);
        if (diff <= threshold && (!bestX || diff < bestX.diff)) {
          bestX = { diff, snapped: otherX - anchor.offset, guide: otherX };
        }
      }
    }

    for (const anchor of activeAnchorsY) {
      for (const otherY of otherAnchorsY) {
        const diff = Math.abs(anchor.value - otherY);
        if (diff <= threshold && (!bestY || diff < bestY.diff)) {
          bestY = { diff, snapped: otherY - anchor.offset, guide: otherY };
        }
      }
    }
  }

  return {
    x: bestX?.snapped,
    y: bestY?.snapped,
    verticalGuideX: bestX?.guide,
    horizontalGuideY: bestY?.guide
  };
}

export interface SizedBounds {
  id: string;
  width: number;
  height: number;
}

export interface SizeSnapResult {
  width?: number;
  height?: number;
  matchedWidthId?: string;
  matchedHeightId?: string;
}

/**
 * Compares an in-progress resize's width/height independently against
 * every other table's width/height, snapping each dimension to the closest
 * match within `threshold`. Width and height can match different tables.
 */
export function computeSizeSnap(
  activeWidth: number,
  activeHeight: number,
  others: SizedBounds[],
  threshold: number
): SizeSnapResult {
  let bestWidth: { diff: number; width: number; id: string } | null = null;
  let bestHeight: { diff: number; height: number; id: string } | null = null;

  for (const other of others) {
    const widthDiff = Math.abs(activeWidth - other.width);
    if (widthDiff <= threshold && (!bestWidth || widthDiff < bestWidth.diff)) {
      bestWidth = { diff: widthDiff, width: other.width, id: other.id };
    }

    const heightDiff = Math.abs(activeHeight - other.height);
    if (heightDiff <= threshold && (!bestHeight || heightDiff < bestHeight.diff)) {
      bestHeight = { diff: heightDiff, height: other.height, id: other.id };
    }
  }

  return {
    width: bestWidth?.width,
    height: bestHeight?.height,
    matchedWidthId: bestWidth?.id,
    matchedHeightId: bestHeight?.id
  };
}
