import { type ChangeSet } from "@codemirror/state";
import { type DecorationSet } from "@codemirror/view";

export interface Suggestion {
  text: string;
  displayText: string;
  cursorPos: number;
  startPos: number;
  endPos: number;
  endReplacement: number;
}

export type CompletionState = null | {
  reverseChangeSet: ChangeSet;
  decorations: DecorationSet;
};

export interface GhostText {
  text: string;
  displayText: string;
  displayPos: number;
  startPos: number;
  endGhostText: number;
  endReplacement: number;
  endPos: number;
  decorations: DecorationSet;
}
