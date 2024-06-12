import { Transaction, EditorSelection } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";
import { copilotEvent, copilotIgnore } from "./annotations.js";
import { completionDecoration } from "./completionDecoration.js";
import { acceptSuggestion, clearSuggestion } from "./effects.js";

export function acceptSuggestionCommand(view: EditorView) {
  // We delete the ghost text and insert the suggestion.
  // We also set the cursor to the end of the suggestion.
  const stateField = view.state.field(completionDecoration);

  if (!stateField) {
    return false;
  }

  const reverseReverseChangeSet = stateField.reverseChangeSet?.invert(
    view.state.doc,
  );

  // This is removing the previous ghost text.
  view.dispatch({
    changes: stateField.reverseChangeSet,
    effects: acceptSuggestion.of(null),
    annotations: [
      // Tell upstream integrations to ignore this
      // change.
      copilotIgnore.of(null),
      // Tell ourselves not to request a completion
      // because of this change.
      copilotEvent.of(null),
      // Don't add this to history.
      Transaction.addToHistory.of(false),
    ],
  });

  let lastIndex = 0;
  reverseReverseChangeSet?.iterChangedRanges((_fromA, _toA, _fromB, toB) => {
    lastIndex = toB;
  });

  view.dispatch({
    changes: reverseReverseChangeSet,
    selection: EditorSelection.cursor(lastIndex),
    annotations: [copilotEvent.of(null), Transaction.addToHistory.of(true)],
  });

  return true;
}

export function rejectSuggestionCommand(view: EditorView) {
  // We delete the suggestion, then carry through with the original keypress
  const stateField = view.state.field(completionDecoration);

  if (!stateField) {
    return false;
  }

  view.dispatch({
    changes: stateField.reverseChangeSet,
    effects: clearSuggestion.of(null),
    annotations: [
      // Tell upstream integrations to ignore this
      // change. This was never really in the document
      // in the first place - we were just showing ghost text.
      copilotIgnore.of(null),
      copilotEvent.of(null),
      Transaction.addToHistory.of(false),
    ],
  });

  return false;
}

// TODO: this isn't full reimplemented yet.
export function sameKeyCommand(view: EditorView, key: string) {
  // When we type a key that is the same as the first letter of the suggestion, we delete the first letter of the suggestion and carry through with the original keypress
  const stateField = view.state.field(completionDecoration);

  if (!stateField) {
    return false;
  }

  if (key === "Tab") {
    return acceptSuggestionCommand(view);
  }
  return rejectSuggestionCommand(view);
}
