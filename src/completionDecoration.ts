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
            console.log(suggestion.startPos, suggestion.endPos);
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

    return state;
  },
  provide: (field) =>
    EditorView.decorations.from(field, (value) => {
      return value?.decorations || Decoration.none;
    }),
});
