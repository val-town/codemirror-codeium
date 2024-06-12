import { Transaction, EditorSelection, ChangeSet } from "@codemirror/state";
import type { Command, EditorView } from "@codemirror/view";
import { copilotEvent, copilotIgnore } from "./annotations.js";
import { completionDecoration } from "./completionDecoration.js";
import {
  acceptSuggestion,
  addSuggestions,
  clearSuggestion,
} from "./effects.js";

/**
 * Accepting a suggestion: we remove the ghost text, which
 * was not part of CodeMirror history, and then re-add it,
 * making sure that it _is_ added to history, and we remove
 * the Decoration that was making that ghost text look ghostly.
 */
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

/**
 * Rejecting a suggestion: this looks at the currently-shown suggestion
 * and reverses it, clears the suggestion, and makes sure
 * that we don't add that clearing transaction to history and we don't
 * trigger a new suggestion because of it.
 */
export const nextSuggestionCommand: Command = (view: EditorView) => {
  const { state } = view;
  // We delete the suggestion, then carry through with the original keypress
  const stateField = state.field(completionDecoration);

  if (!stateField) {
    return false;
  }

  const { changeSpecs } = stateField;

  if (changeSpecs.length < 2) {
    return false;
  }

  // Loop through next suggestion.
  const index = (stateField.index + 1) % changeSpecs.length;
  const nextSpec = changeSpecs.at(index);
  if (!nextSpec) {
    return false;
  }

  /**
   * First, get the original document, by applying the stored
   * reverse changeset against the currently-displayed document.
   */
  const originalDocument = stateField.reverseChangeSet.apply(state.doc);

  /**
   * Get the changeset that we will apply that will
   *
   * 1. Reverse the currently-displayed suggestion, to get us back to
   *    the original document
   * 2. Apply the next suggestion.
   *
   * It does both in the same changeset, so there is no flickering.
   */
  const reverseCurrentSuggestionAndApplyNext = ChangeSet.of(
    stateField.reverseChangeSet,
    state.doc.length,
  ).compose(ChangeSet.of(nextSpec, originalDocument.length));

  /**
   * Generate the next changeset
   */
  const nextSet = ChangeSet.of(nextSpec, originalDocument.length);
  const reverseChangeSet = nextSet.invert(originalDocument);

  view.dispatch({
    changes: reverseCurrentSuggestionAndApplyNext,
    effects: addSuggestions.of({
      index,
      reverseChangeSet,
      changeSpecs,
    }),
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

  return true;
};

/**
 * Rejecting a suggestion: this looks at the currently-shown suggestion
 * and reverses it, clears the suggestion, and makes sure
 * that we don't add that clearing transaction to history and we don't
 * trigger a new suggestion because of it.
 */
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
