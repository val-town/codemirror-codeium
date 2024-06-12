import {
  StateField,
  type EditorState,
  type Transaction,
} from "@codemirror/state";
import { Decoration, EditorView } from "@codemirror/view";
import {
  addSuggestions,
  acceptSuggestion,
  clearSuggestion,
} from "./effects.js";
import type { CompletionState } from "./types.js";

const ghostMark = Decoration.mark({ class: "cm-ghostText" });

/**
 * Note that the completion _text_ is not actually a decoration!
 * The text is very real, and actually inserted into the editor.
 * The completion decoration is just a decoration that matches
 * the same range as the completion text, and changes how it looks.
 */
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
          effect.value.suggestions.map((suggestionRange) => {
            const range = ghostMark.range(
              suggestionRange.absoluteStartPos,
              suggestionRange.absoluteEndPos,
            );
            return range;
          }),
        );

        // TODO
        return {
          decorations,
          reverseChangeSet: effect.value.reverseChangeSet,
        };
      }
      if (effect.is(acceptSuggestion)) {
        return null;
      }
      if (effect.is(clearSuggestion)) {
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
