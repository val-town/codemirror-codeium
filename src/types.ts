import type { ChangeSet } from "@codemirror/state";
import type { DecorationSet } from "@codemirror/view";

export type CompletionState = null | {
  reverseChangeSet: ChangeSet;
  decorations: DecorationSet;
};

export interface GhostText {
  text: string;
  displayPos: number;
  startPos: number;
  endGhostText: number;
  endPos: number;
  decorations: DecorationSet;
}

/**
 * This is one of the variants of a ChangeSpec,
 * plus the absoluteStartPos and absoluteEndPos
 * properties.
 */
export type SimpleChangeSpec = {
  absoluteStartPos: number;
  absoluteEndPos: number;
  from: number;
  to: number;
  insert: string;
};
