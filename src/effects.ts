import { type ChangeSet, StateEffect } from "@codemirror/state";
import type { SimpleChangeSpec } from "./types.js";

// Effects to tell StateEffect what to do with GhostText
export const addSuggestions = StateEffect.define<{
  reverseChangeSet: ChangeSet;
  suggestions: SimpleChangeSpec[];
}>();
export const acceptSuggestion = StateEffect.define<null>();
export const clearSuggestion = StateEffect.define<null>();
