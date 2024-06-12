import { StateEffect } from "@codemirror/state";
import type { AddSuggestionsState } from "./types.js";

// Effects to tell StateEffect what to do with GhostText
export const addSuggestions = StateEffect.define<AddSuggestionsState>();
export const acceptSuggestion = StateEffect.define<null>();
export const clearSuggestion = StateEffect.define<null>();
