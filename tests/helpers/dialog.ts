/**
 * jsdom 30 has <dialog> but no showModal()/close(). These stand in for the
 * browser: showModal()/show() set `open`, and close() clears it and fires the
 * non-bubbling `close` event, the one React's onClose listens for (a real
 * browser also fires it after Esc).
 */
export function stubDialog(): void {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.show = function show(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    if (!this.hasAttribute('open')) return;
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
}
