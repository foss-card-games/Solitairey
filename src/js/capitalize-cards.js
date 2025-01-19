define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.BoardTextLine = void 0;
    exports.capitalize_cards = capitalize_cards;
    class BoardTextLine {
        constructor(line) {
            this.line = line;
            const that = this;
            const m1 = line.match(/^([^\n\r]*)([\n\r]*)$/);
            that.newline = m1[2];
            let l = m1[1];
            if (m1[1].match(/#/)) {
                const m2 = m1[1].match(/^(.*?)(#.*)/);
                that.comment = m2[2];
                l = m2[1];
            }
            else {
                that.comment = "";
            }
            if (l.match(/:/)) {
                const m3 = l.match(/^([^:]*:)(.*)/);
                that.prefix = m3[1];
                that.content = m3[2];
            }
            else {
                that.prefix = "";
                that.content = l;
            }
            return;
        }
        getContent() {
            return this.content;
        }
        capitalize() {
            const that = this;
            const ret = that.prefix +
                that.getContent().toUpperCase() +
                that.comment +
                that.newline;
            return ret;
        }
    }
    exports.BoardTextLine = BoardTextLine;
    function capitalize_cards(board) {
        return board
            .match(/[^\n]*\n?/g)
            .map((l) => {
            return new BoardTextLine(l).capitalize();
        })
            .join("");
    }
});
