import {
  Decoration,
  DecorationSet,
  EditorView,
  ViewUpdate,
} from "@codemirror/view";
import {
  Annotation,
  EditorState,
  EditorSelection,
  Extension,
  Prec,
  StateEffect,
  StateField,
  Transaction,
  ChangeSet,
} from "@codemirror/state";
import { completionStatus } from "@codemirror/autocomplete";
import { getCodeiumCompletions } from "./codeium.js";

// milliseconds before cancelling request
// against codeium
const TIMEOUT = 150;

interface Suggestion {
  text: string;
  displayText: string;
  cursorPos: number;
  startPos: number;
  endPos: number;
  endReplacement: number;
}

interface CompletionState {
  ghostTexts: GhostText[] | null;
  reverseChangeSet?: ChangeSet;
  decorations?: DecorationSet;
}

interface GhostText {
  text: string;
  displayText: string;
  displayPos: number;
  startPos: number;
  endGhostText: number;
  endReplacement: number;
  endPos: number;
  decorations: DecorationSet;
}

const ghostMark = Decoration.mark({ class: "cm-ghostText" });

const copilotEvent = Annotation.define<null>();

// Effects to tell StateEffect what to do with GhostText
const addSuggestions = StateEffect.define<{
  reverseChangeSet: ChangeSet;
  suggestions: Suggestion[];
}>();
const acceptSuggestion = StateEffect.define<null>();
const clearSuggestion = StateEffect.define<null>();

const completionDecoration = StateField.define<CompletionState>({
  create(_state: EditorState) {
    return { ghostTexts: null };
  },
  update(state: CompletionState, transaction: Transaction) {
    for (const effect of transaction.effects) {
      if (effect.is(addSuggestions)) {
        // When adding a suggestion, we set th ghostText

        // NOTE: here we're adjusting the decoration range
        // to refer to locations in the document _after_ we've
        // inserted the text.
        let decorationOffset = 0;
        const decorations = Decoration.set(
          effect.value.suggestions.map((suggestion) => {
            const endGhostText =
              suggestion.cursorPos + suggestion.displayText.length;
            let range = ghostMark.range(
              decorationOffset + suggestion.cursorPos,
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

function acceptSuggestionCommand(view: EditorView) {
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
  reverseReverseChangeSet?.iterChangedRanges((fromA, toA, fromB, toB) => {
    lastIndex = toB;
  });

  view.dispatch({
    changes: reverseReverseChangeSet,
    selection: EditorSelection.cursor(lastIndex),
    annotations: [copilotEvent.of(null), Transaction.addToHistory.of(true)],
  });

  return true;
}

function rejectSuggestionCommand(view: EditorView) {
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
function sameKeyCommand(view: EditorView, key: string) {
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

function completionPlugin() {
  return EditorView.domEventHandlers({
    keydown(event, view) {
      if (
        event.key !== "Shift" &&
        event.key !== "Control" &&
        event.key !== "Alt" &&
        event.key !== "Meta"
      ) {
        return sameKeyCommand(view, event.key);
      } else {
        return false;
      }
    },
    mousedown(_event, view) {
      return rejectSuggestionCommand(view);
    },
  });
}

function viewCompletionPlugin() {
  return EditorView.updateListener.of((update) => {
    if (update.focusChanged) {
      rejectSuggestionCommand(update.view);
    }
  });
}

/**
 * Don't request a completion if we've already
 * done so, or it's a copilot event we're responding
 * to, or if the view is not focused.
 */
function shouldIgnoreUpdate(update: ViewUpdate) {
  // not focused
  if (!update.view.hasFocus) return true;

  // contains ghost text
  if (update.state.field(completionDecoration).ghostTexts != null) return true;

  // is autocompleting
  if (completionStatus(update.state) === "active") return true;

  // bad update
  for (const tr of update.transactions) {
    if (tr.annotation(copilotEvent) !== undefined) {
      return true;
    }
  }
}

/**
 * To request a completion, the document needs to have been
 * updated and the update should not have been because
 * of accepting or clearing a suggestion.
 */
function shouldRequestCompletion(update: ViewUpdate) {
  return (
    update.docChanged &&
    !update.transactions.some((tr) =>
      tr.effects.some((e) => e.is(acceptSuggestion) || e.is(clearSuggestion)),
    )
  );
}

/**
 * A view plugin that requests completions from the server after a delay
 */
function completionRequester() {
  let timeout: any = null;
  let lastPos = 0;

  return EditorView.updateListener.of((update: ViewUpdate) => {
    if (!shouldRequestCompletion(update)) return;

    // Cancel the previous timeout
    if (timeout) {
      clearTimeout(timeout);
    }

    if (shouldIgnoreUpdate(update)) {
      return;
    }

    // Get the current position and source
    const state = update.state;
    const pos = state.selection.main.head;
    const source = state.doc.toString();

    // Set a new timeout to request completion
    timeout = setTimeout(async () => {
      // Check if the position has changed
      if (pos !== lastPos) return;

      // Request completion from the server
      try {
        const completionResult = await getCodeiumCompletions({
          text: source,
          cursorOffset: pos,
        });

        if (!completionResult || completionResult.length === 0) {
          return;
        }

        // Check if the position is still the same
        if (
          pos === lastPos &&
          completionStatus(update.view.state) !== "active" &&
          update.view.hasFocus
        ) {
          // Dispatch an effect to add the suggestion
          // If the completion starts before the end of the line,
          // check the end of the line with the end of the completion
          const insertChangeSet = ChangeSet.of(
            completionResult.map((part) => ({
              from: Number(part.offset),
              to: Number(part.offset),
              insert: part.text,
            })),
            state.doc.length,
          );

          const reverseChangeSet = insertChangeSet.invert(state.doc);

          update.view.dispatch({
            changes: insertChangeSet,
            effects: addSuggestions.of({
              reverseChangeSet,
              suggestions: completionResult.map((part) => ({
                displayText: part.text,
                endReplacement: 0, // "",
                text: part.text,
                cursorPos: pos,
                startPos: Number(part.offset),
                endPos: Number(part.offset) + part.text.length,
              })),
            }),
            annotations: [
              copilotEvent.of(null),
              Transaction.addToHistory.of(false),
            ],
          });
        }
      } catch (error) {
        console.warn("copilot completion failed", error);
        // Javascript wait for 500ms for some reason is necessary here.
        // TODO - FIGURE OUT WHY THIS RESOLVES THE BUG

        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }, TIMEOUT);
    // Update the last position
    lastPos = pos;
  });
}

export function copilotPlugin(): Extension {
  return [
    completionDecoration,
    Prec.highest(completionPlugin()),
    Prec.highest(viewCompletionPlugin()),
    completionRequester(),
  ];
}
