import "@testing-library/jest-dom";

// Radix UI uses Pointer Events API methods not implemented in jsdom.
// Polyfill them so components like Select and Dialog can interact correctly.
window.HTMLElement.prototype.hasPointerCapture = () => false;
window.HTMLElement.prototype.setPointerCapture = () => {};
window.HTMLElement.prototype.releasePointerCapture = () => {};

// Radix UI calls scrollIntoView when opening Select dropdowns.
// jsdom stubs it but it may be missing on specific element types.
window.Element.prototype.scrollIntoView = () => {};
