// utils.js
export function qs(selector){ return document.querySelector(selector); }
export function qsa(selector){ return Array.from(document.querySelectorAll(selector)); }
export function show(el){ el.classList.remove('hidden'); }
export function hide(el){ el.classList.add('hidden'); }
export function toBool(s){ if(s === true || s === 'true') return true; if(s === false || s === 'false') return false; return null; }
