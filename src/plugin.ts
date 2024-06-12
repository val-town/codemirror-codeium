import { EditorView, keymap, type ViewUpdate } from "@codemirror/view";
import { type Extension, Prec } from "@codemirror/state";
import { completionDecoration } from "./completionDecoration.js";
import { completionRequester } from "./completionRequester.js";
import {
  sameKeyCommand,
  rejectSuggestionCommand,
  acceptSuggestionCommand,
  nextSuggestionCommand,
} from "./commands.js";
import {
  type CodeiumConfig,
  type CodeiumOtherDocumentsConfig,
  codeiumConfig,
  codeiumOtherDocumentsConfig,
} from "./config.js";
import { Language } from "./api/proto/exa/codeium_common_pb/codeium_common_pb.js";
import { copilotIgnore } from "./annotations.js";

/**
 * Clicking a completion accepts it. This figures out
 * whether a given click event is within the completion's area.
 */
function isDecorationClicked(view: EditorView): boolean {
  let inRange = false;
  const head = view.state.selection.asSingle().ranges.at(0)?.head;
  const stateField = view.state.field(completionDecoration);
  if (head !== undefined && stateField) {
    stateField.decorations?.between(head, head, () => {
      inRange = true;
    });
    return inRange;
  }
  return false;
}

/**
 * Handles the behavior in which if you have a completion like
 *
 * foo|bar
 *
 * (the cursor is at |) and you type an x, it rejects
 * the completion because that isn't part of the suggested
 * code.
 */
function completionPlugin() {
  return EditorView.domEventHandlers({
    keydown(event, view) {
      // Ideally, we handle infighting between
      // the nextSuggestionCommand and this handler
      // by using precedence, but I can't get that to work
      // yet.
      if (event.key === "]" && event.ctrlKey) {
        return false;
      }
      if (
        event.key !== "Shift" &&
        event.key !== "Control" &&
        event.key !== "Alt" &&
        event.key !== "Meta"
      ) {
        return sameKeyCommand(view, event.key);
      }
      return false;
    },
    mouseup(event, view) {
      const target = event.target as HTMLElement;
      if (
        target.nodeName === "BUTTON" &&
        target.dataset.action === "codeium-cycle"
      ) {
        nextSuggestionCommand(view);
        event.stopPropagation();
        event.preventDefault();
        return true;
      }
      if (isDecorationClicked(view)) {
        return acceptSuggestionCommand(view);
      }
      return rejectSuggestionCommand(view);
    },
  });
}

/**
 * Next completion map
 */
function nextCompletionPlugin() {
  return keymap.of([
    {
      key: "Ctrl-]",
      run: nextSuggestionCommand,
    },
  ]);
}

/**
 * Changing the editor's focus - blurring it by clicking outside -
 * rejects the suggestion
 */
function viewCompletionPlugin() {
  return EditorView.updateListener.of((update) => {
    if (update.focusChanged) {
      rejectSuggestionCommand(update.view);
    }
  });
}

export {
  Language,
  copilotIgnore,
  codeiumConfig,
  codeiumOtherDocumentsConfig,
  nextSuggestionCommand,
  type CodeiumOtherDocumentsConfig,
  type CodeiumConfig,
};

/**
 * A combination of configuration, the keymap, the
 * requester - as a composite extension for simplicity.
 */
export function copilotPlugin(config: CodeiumConfig): Extension {
  return [
    codeiumConfig.of(config),
    completionDecoration,
    Prec.highest(nextCompletionPlugin()),
    Prec.highest(viewCompletionPlugin()),
    Prec.high(completionPlugin()),
    completionRequester(),
  ];
}

/**
 * Returns false if this ViewUpdate is just the plugin
 * adding or removing ghost text, and it should not be
 * considered when saving this CodeMirror state into other
 * systems, like draft recovery.
 */
export function shouldTakeUpdate(update: ViewUpdate) {
  for (const tr of update.transactions) {
    if (tr.annotation(copilotIgnore) !== undefined) {
      return false;
    }
  }
  return true;
}
