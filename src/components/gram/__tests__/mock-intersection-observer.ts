// jsdom ships no IntersectionObserver. vitest.setup.ts installs this one globally; tests trigger it to load more.
// It lives under src/ because the Docker build copies only src/ and `next build` type-checks the tests too.
export class MockIntersectionObserver implements IntersectionObserver {
    static instances: MockIntersectionObserver[] = [];

    readonly root: Element | Document | null = null;
    readonly rootMargin: string = "";
    readonly scrollMargin: string = "";
    readonly thresholds: ReadonlyArray<number> = [];

    callback: IntersectionObserverCallback;
    elements = new Set<Element>();

    constructor(callback: IntersectionObserverCallback) {
        this.callback = callback;
        MockIntersectionObserver.instances.push(this);
    }

    observe = (el: Element) => {
        this.elements.add(el);
    };
    unobserve = (el: Element) => {
        this.elements.delete(el);
    };
    disconnect = () => {
        this.elements.clear();
    };
    takeRecords = (): IntersectionObserverEntry[] => [];

    trigger(isIntersecting: boolean) {
        const entries = Array.from(this.elements).map(
            (target) => ({ isIntersecting, target }) as IntersectionObserverEntry,
        );
        this.callback(entries, this);
    }
}
