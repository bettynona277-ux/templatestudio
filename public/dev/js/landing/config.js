// Railway forwards this same-origin path to Firebase through LANDING_API_URL.
// The browser never needs to know the Firebase Function URL.
window.LANDING_CONFIG = Object.freeze({ apiBase: '/api/landing' });
