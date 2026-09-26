import { act } from '@testing-library/react';
import { vi } from 'vitest';

type Entry = Partial<IntersectionObserverEntry> & { target: Element };

/**
 * A controllable IntersectionObserver for jsdom, which has none. Components
 * construct it as they would in a browser; a test finds the observer watching
 * an element and delivers the entries a browser would have computed.
 */
export class FakeIO {
  static instances: FakeIO[] = [];
  readonly targets: Element[] = [];
  readonly callback: IntersectionObserverCallback;
  readonly options: IntersectionObserverInit;

  constructor(callback: IntersectionObserverCallback, options: IntersectionObserverInit = {}) {
    this.callback = callback;
    this.options = options;
    FakeIO.instances.push(this);
  }

  observe(el: Element): void {
    this.targets.push(el);
  }

  unobserve(el: Element): void {
    const i = this.targets.indexOf(el);
    if (i >= 0) this.targets.splice(i, 1);
  }

  disconnect(): void {
    this.targets.length = 0;
  }

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }

  fire(entries: Entry[]): void {
    act(() => {
      this.callback(entries as IntersectionObserverEntry[], this as unknown as IntersectionObserver);
    });
  }

  /** The newest live observer watching `el`. Throws when there is none, so a
   *  test can never fire into the void and pass by accident. */
  static watching(el: Element): FakeIO {
    const io = [...FakeIO.instances].reverse().find((o) => o.targets.includes(el));
    if (!io) throw new Error(`no IntersectionObserver is watching <${el.tagName.toLowerCase()}${el.id ? ` id="${el.id}"` : ''}>`);
    return io;
  }
}

export function installFakeIO(): void {
  FakeIO.instances = [];
  vi.stubGlobal('IntersectionObserver', FakeIO);
}
