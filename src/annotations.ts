import { Annotation } from "@codemirror/state";

export const copilotEvent = Annotation.define<null>();

/**
 * Annotation that signals to upstream integrations
 * that this transaction should not be included
 * in history or treated otherwise as a user edit.
 */
export const copilotIgnore = Annotation.define<null>();
