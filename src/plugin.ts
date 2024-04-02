import { EditorView, ViewUpdate } from "@codemirror/view";
import { Extension, Prec } from "@codemirror/state";
import { completionDecoration } from "./completionDecoration.js";
import { completionRequester } from "./completionRequester.js";
import {
  sameKeyCommand,
  rejectSuggestionCommand,
  acceptSuggestionCommand,
} from "./commands.js";
import { CodeiumConfig, codeiumConfig } from "./config.js";
import { Language } from "./api/proto/exa/codeium_common_pb/codeium_common_pb.js";
import { copilotIgnore } from "./annotations.js";

function isDecorationClicked(view: EditorView) {
  let inRange = false;
  const head = view.state.selection.asSingle().ranges.at(0)?.head;
  if (head !== undefined) {
    view.state
      .field(completionDecoration)
      .decorations?.between(head, head, () => {
        inRange = true;
      });
    return inRange;
  }
  return false;
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
    mouseup(_event, view) {
      if (isDecorationClicked(view)) {
        return acceptSuggestionCommand(view);
      } else {
        return rejectSuggestionCommand(view);
      }
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

export { Language, copilotIgnore };

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
