import { ChangeSet, StateEffect } from "@codemirror/state";
import { Suggestion } from "./types.js";

// Effects to tell StateEffect what to do with GhostText
export const addSuggestions = StateEffect.define<{
  reverseChangeSet: ChangeSet;
  suggestions: Suggestion[];
}>();
export const acceptSuggestion = StateEffect.define<null>();
export const clearSuggestion = StateEffect.define<null>();
