import { StateField, EditorState, Transaction } from "@codemirror/state";
import { Decoration, EditorView } from "@codemirror/view";
import {
  addSuggestions,
  acceptSuggestion,
  clearSuggestion,
} from "./effects.js";
import { CompletionState } from "./types.js";

const ghostMark = Decoration.mark({ class: "cm-ghostText" });

export const completionDecoration = StateField.define<CompletionState>({
  create(_state: EditorState) {
    return null;
  },
  update(state: CompletionState, transaction: Transaction) {
    for (const effect of transaction.effects) {
      if (effect.is(addSuggestions)) {
        // NOTE: here we're adjusting the decoration range
        // to refer to locations in the document _after_ we've
        // inserted the text.
        const decorations = Decoration.set(
          effect.value.suggestions.map((suggestion) => {
            let range = ghostMark.range(suggestion.startPos, suggestion.endPos);
            return range;
          }),
        );

        // TODO
        return {
          decorations,
          reverseChangeSet: effect.value.reverseChangeSet,
        };
      } else if (effect.is(acceptSuggestion)) {
        return null;
      } else if (effect.is(clearSuggestion)) {
        return null;
      }
    }

    if (state) {
      // If we ever have a state that is being updated,
      // map it through the new changes to avoid the potential
      // of a mismatch between it and the new document and new
      // document length
      return {
        decorations: state.decorations.map(transaction.changes),
        reverseChangeSet: state.reverseChangeSet.map(transaction.changes),
      };
    }

    return state;
  },
  provide: (field) =>
    EditorView.decorations.from(field, (value) => {
      return value?.decorations || Decoration.none;
    }),
});
