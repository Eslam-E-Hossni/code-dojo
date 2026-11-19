/**
 * Focus inside the test frame.
 *
 * The frame is hidden and isolated, so the browser does not give it the
 * keyboard focus. Depending on the browser and on which window is active,
 * focus() then either moves `document.activeElement` but fires no event,
 * or does nothing at all. Tests need both: user-event types into the
 * active element, and it prepares an input when it sees its focus event.
 * Without them, typed text never reaches React.
 *
 * So focus is kept here by hand, the way jsdom does it: when the browser
 * does not do its part, this code remembers the focused element, reports
 * it as `document.activeElement`, and fires the focus and blur events.
 */

const FOCUSABLE =
  'input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), ' +
  'a[href], area[href], summary, [tabindex], [contenteditable=""], [contenteditable="true"]';

export function installFocusEvents(view: Window & typeof globalThis): void {
  const doc = view.document;
  const proto = view.HTMLElement.prototype;
  const nativeFocus = proto.focus;
  const nativeBlur = proto.blur;
  const nativeActive = Object.getOwnPropertyDescriptor(view.Document.prototype, "activeElement")?.get;
  if (!nativeActive) return;

  /** The element that has the focus by hand, when the browser refused to move it. */
  let emulated: Element | null = null;

  const active = (): Element | null => {
    if (emulated !== null && emulated.isConnected) return emulated;
    emulated = null;
    return nativeActive.call(doc);
  };

  Object.defineProperty(doc, "activeElement", { configurable: true, get: active });

  const fire = (target: Element, type: string, bubbles: boolean, related: Element | null) => {
    target.dispatchEvent(new view.FocusEvent(type, { bubbles, relatedTarget: related }));
  };

  /** Runs `action` and says whether the browser fired `type` on the element by itself. */
  const heard = (element: Element, type: string, action: () => void): boolean => {
    let fired = false;
    const mark = () => {
      fired = true;
    };
    element.addEventListener(type, mark, { capture: true, once: true });
    action();
    element.removeEventListener(type, mark, { capture: true });
    return fired;
  };

  const focusElement = (element: HTMLElement, options?: FocusOptions) => {
    const before = active();
    if (before === element) return;

    const fired = heard(element, "focus", () => nativeFocus.call(element, options));
    const movedByBrowser = nativeActive.call(doc) === element;
    if (movedByBrowser) emulated = null;
    else if (element.isConnected && element.ownerDocument === doc && element.matches(FOCUSABLE)) emulated = element;
    else return;

    // The browser did all of it.
    if (fired) return;
    if (before && before !== doc.body) {
      fire(before, "blur", false, element);
      fire(before, "focusout", true, element);
    }
    fire(element, "focus", false, before);
    fire(element, "focusin", true, before);
  };

  const blurElement = (element: HTMLElement) => {
    if (active() !== element) {
      nativeBlur.call(element);
      return;
    }
    const fired = heard(element, "blur", () => nativeBlur.call(element));
    emulated = null;
    if (fired) return;
    fire(element, "blur", false, null);
    fire(element, "focusout", true, null);
  };

  proto.focus = function focus(this: HTMLElement, options?: FocusOptions) {
    focusElement(this, options);
  };

  proto.blur = function blur(this: HTMLElement) {
    blurElement(this);
  };
}
