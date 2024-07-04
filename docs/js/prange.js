define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.perl_range = perl_range;
    function perl_range(start, end) {
        const ret = [];
        for (let i = start; i <= end; ++i) {
            ret.push(i);
        }
        return ret;
    }
});
