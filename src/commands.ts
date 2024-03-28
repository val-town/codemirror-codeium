import { Transaction, EditorSelection } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { copilotEvent } from "./annotations.js";
import { completionDecoration } from "./completionDecoration.js";
import { acceptSuggestion, clearSuggestion } from "./effects.js";

export function acceptSuggestionCommand(view: EditorView) {
  // We delete the ghost text and insert the suggestion.
  // We also set the cursor to the end of the suggestion.
  const stateField = view.state.field(completionDecoration)!;
  const ghostTexts = stateField.ghostTexts;

  if (!ghostTexts) {
    return false;
  }

  const reverseReverseChangeSet = stateField.reverseChangeSet?.invert(
    view.state.doc,
  );

  // This is removing the previous ghost text. Don't
  // add this to history.
  view.dispatch({
    changes: stateField.reverseChangeSet,
    effects: acceptSuggestion.of(null),
    annotations: [copilotEvent.of(null), Transaction.addToHistory.of(false)],
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
  const stateField = view.state.field(completionDecoration)!;
  const ghostTexts = stateField.ghostTexts;

  if (!ghostTexts?.length) {
    return false;
  }

  view.dispatch({
    changes: stateField.reverseChangeSet,
    effects: clearSuggestion.of(null),
    annotations: [copilotEvent.of(null), Transaction.addToHistory.of(false)],
  });

  return false;
}

// TODO: this isn't full reimplemented yet.
export function sameKeyCommand(view: EditorView, key: string) {
  // When we type a key that is the same as the first letter of the suggestion, we delete the first letter of the suggestion and carry through with the original keypress
  const ghostTexts = view.state.field(completionDecoration)!.ghostTexts;

  if (!ghostTexts || !ghostTexts.length) {
    return false;
  }

  if (key === "Tab") {
    return acceptSuggestionCommand(view);
  } else {
    return rejectSuggestionCommand(view);
  }
}
