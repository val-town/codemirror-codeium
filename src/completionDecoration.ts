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
    return { ghostTexts: null };
  },
  update(state: CompletionState, transaction: Transaction) {
    for (const effect of transaction.effects) {
      if (effect.is(addSuggestions)) {
        // NOTE: here we're adjusting the decoration range
        // to refer to locations in the document _after_ we've
        // inserted the text.
        let decorationOffset = 0;
        const decorations = Decoration.set(
          effect.value.suggestions.map((suggestion) => {
            const endGhostText =
              suggestion.startPos + suggestion.displayText.length;
            let range = ghostMark.range(
              decorationOffset + suggestion.startPos,
              decorationOffset + endGhostText,
            );
            decorationOffset += suggestion.displayText.length;
            return range;
          }),
        );

        // TODO
        return {
          decorations,
          reverseChangeSet: effect.value.reverseChangeSet,
          ghostTexts: effect.value.suggestions.map((suggestion) => {
            const endGhostText =
              suggestion.cursorPos + suggestion.displayText.length;
            return {
              text: suggestion.text,
              displayText: suggestion.text,
              startPos: suggestion.startPos,
              endPos: suggestion.endPos,
              decorations,
              // TODO: what's the difference between this
              // and startPos?
              displayPos: suggestion.cursorPos,
              endReplacement: suggestion.endReplacement,
              endGhostText,
            };
          }),
        };
      } else if (effect.is(acceptSuggestion)) {
        if (state.ghostTexts) {
          return { ghostTexts: null };
        }
      } else if (effect.is(clearSuggestion)) {
        return { ghostTexts: null };
      }
    }

    return state;
  },
  provide: (field) =>
    EditorView.decorations.from(field, (value) => {
      return value.decorations || Decoration.none;
    }),
});
