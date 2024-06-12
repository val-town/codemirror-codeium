import { WidgetType } from "@codemirror/view";

/**
 * Shown at the end of a suggestion if there are multiple
 * suggestions to cycle through.
 */
export class DefaultCycleWidget extends WidgetType {
  index: number;
  total: number;

  constructor(index: number, total: number) {
    super();
    this.index = index;
    this.total = total;
  }

  toDOM() {
    const wrap = document.createElement("span");
    wrap.setAttribute("aria-hidden", "true");
    wrap.className = "cm-codeium-cycle";
    const words = wrap.appendChild(document.createElement("span"));
    words.className = "cm-codeium-cycle-explanation";
    words.innerText = `${this.index + 1}/${this.total}`;
    const key = wrap.appendChild(document.createElement("button"));
    key.className = "cm-codeium-cycle-key";
    key.innerText = "⌥-]";
    key.dataset.action = "codeium-cycle";
    return wrap;
  }

  ignoreEvent() {
    return false;
  }
}
