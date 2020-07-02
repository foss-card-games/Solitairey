define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.rank_re = exports.rank_str = exports.suit_re = exports.suits__int_to_str = void 0;
    exports.suits__int_to_str = "HCDS";
    exports.suit_re = "[" + exports.suits__int_to_str + "]";
    exports.rank_str = "A23456789TJQK";
    exports.rank_re = "[" + exports.rank_str + "]";
});
