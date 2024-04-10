import { type ChangeSet } from "@codemirror/state";
import { type DecorationSet } from "@codemirror/view";

export interface Suggestion {
  text: string;
  cursorPos: number;
  startPos: number;
  endPos: number;
}

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
