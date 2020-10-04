"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function mydef(x, y) {
  if (typeof define !== 'function') {
    return require('amdefine')(module)(x, y);
  } else {
    return define(x, y);
  }
} // Taken from https://stackoverflow.com/questions/47879864/
// thanks!


var supported = function () {
  try {
    if ((typeof WebAssembly === "undefined" ? "undefined" : _typeof(WebAssembly)) === "object" && typeof WebAssembly.instantiate === "function") {
      var _module = new WebAssembly.Module(Uint8Array.of(0x0, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00));

      if (_module instanceof WebAssembly.Module) {
        return new WebAssembly.Instance(_module) instanceof WebAssembly.Instance;
      }
    }
  } catch (e) {}

  return false;
}();

mydef([supported ? "libfreecell-solver.min" : // mydef([(false ? "libfreecell-solver.min" :
"libfreecell-solver-asm"], function (M) {
  return M;
});
