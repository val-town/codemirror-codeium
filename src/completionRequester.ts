import { CompletionContext, completionStatus } from "@codemirror/autocomplete";
import { EditorView, type ViewUpdate } from "@codemirror/view";
import { acceptSuggestion, clearSuggestion } from "./effects.js";
import { completionDecoration } from "./completionDecoration.js";
import { copilotEvent } from "./annotations.js";
import { codeiumConfig } from "./config.js";
import { requestCompletion } from "./requestCompletion.js";

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
 * Don't request a completion if we've already
 * done so, or it's a copilot event we're responding
 * to, or if the view is not focused.
 */
function shouldIgnoreUpdate(update: ViewUpdate) {
  // not focused
  if (!update.view.hasFocus) return true;

  // contains ghost text
  if (update.state.field(completionDecoration)) return true;

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
 * A view plugin that requests completions from the server after a delay
 */
export function completionRequester() {
  let timeout: number | null = null;
  let lastPos = 0;

  return EditorView.updateListener.of((update: ViewUpdate) => {
    const config = update.view.state.facet(codeiumConfig);
    if (!config.alwaysOn) return;

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

    // If we've configured a custom rule for when to show completions
    // and that rule says no, don't offer completions.
    if (
      config.shouldComplete &&
      !config.shouldComplete(
        new CompletionContext(update.view.state, pos, false),
      )
    ) {
      return;
    }

    // Set a new timeout to request completion
    timeout = setTimeout(async () => {
      // Check if the position has changed
      if (pos !== lastPos) return;

      await requestCompletion(update.view, lastPos);
    }, config.timeout);

    // Update the last position
    lastPos = pos;
  });
}
