import type { Range, ChangeSet } from "@codemirror/state";
import type { Decoration, DecorationSet } from "@codemirror/view";

/**
 * We dispatch an effect that updates the CompletionState.
 * CompletionState is null if no completions are displayed.
 */
export type CompletionState = null | {
  index: number;
  reverseChangeSet: ChangeSet;
  changeSpecs: SimpleChangeSpec[][];
  decorations: DecorationSet;
};

export type AddSuggestionsState = {
  reverseChangeSet: ChangeSet;
  changeSpecs: SimpleChangeSpec[][];
  index: number;
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
