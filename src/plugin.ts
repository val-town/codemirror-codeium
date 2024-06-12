import { EditorView, type ViewUpdate } from "@codemirror/view";
import { type Extension, Prec } from "@codemirror/state";
import { completionDecoration } from "./completionDecoration.js";
import { completionRequester } from "./completionRequester.js";
import {
  sameKeyCommand,
  rejectSuggestionCommand,
  acceptSuggestionCommand,
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
    mouseup(_event, view) {
      if (isDecorationClicked(view)) {
        return acceptSuggestionCommand(view);
      }
      return rejectSuggestionCommand(view);
    },
  });
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
    Prec.highest(completionPlugin()),
    Prec.highest(viewCompletionPlugin()),
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
