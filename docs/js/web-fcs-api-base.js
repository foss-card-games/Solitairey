define(["require", "exports", "./prange"], function (require, exports, prange_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.base_calc_module_wrapper = base_calc_module_wrapper;
    exports.deal_ms_fc_board = deal_ms_fc_board;
    function base_calc_module_wrapper(Module) {
        const ms_rand__get = Module.cwrap("fc_solve__hll_ms_rand__get_global_instance", "number", []);
        const ms_rand__init = Module.cwrap("fc_solve__hll_ms_rand__init", "number", ["number", "string"]);
        const ms_rand__mod_rand = Module.cwrap("fc_solve__hll_ms_rand__mod_rand", "number", ["number", "number"]);
        return {
            ms_rand__get,
            ms_rand__init,
            ms_rand__mod_rand,
            Module,
        };
    }
    /*
     * Microsoft C Run-time-Library-compatible Random Number Generator
     * Copyright by Shlomi Fish, 2011.
     * Released under the MIT/Expat License
     * ( http://en.wikipedia.org/wiki/MIT_License ).
     * */
    class MSRand {
        constructor(args) {
            const that = this;
            that.module_wrapper = args.module_wrapper;
            that.gamenumber = args.gamenumber;
            that.rander = that.module_wrapper.ms_rand__get();
            that.module_wrapper.ms_rand__init(that.rander, "" + that.gamenumber);
            return;
        }
        max_rand(mymax) {
            const that = this;
            return that.module_wrapper.ms_rand__mod_rand(that.rander, mymax);
        }
        shuffle(deck) {
            const that = this;
            if (deck.length) {
                let i = deck.length;
                while (--i) {
                    const j = that.max_rand(i + 1);
                    const tmp = deck[i];
                    deck[i] = deck[j];
                    deck[j] = tmp;
                }
            }
            return deck;
        }
    }
    /*
     * Microsoft Windows Freecell / Freecell Pro boards generation.
     *
     * See:
     *
     * - http://rosettacode.org/wiki/Deal_cards_for_FreeCell
     *
     * - http://www.solitairelaboratory.com/mshuffle.txt
     *
     * Under MIT/Expat Licence.
     *
     * */
    function deal_ms_fc_board(module_wrapper, seed) {
        const randomizer = new MSRand({
            module_wrapper: module_wrapper,
            gamenumber: seed,
        });
        const num_cols = 8;
        const columns = (0, prange_1.perl_range)(0, num_cols - 1).map(() => {
            return [];
        });
        let deck = (0, prange_1.perl_range)(0, 4 * 13 - 1);
        randomizer.shuffle(deck);
        deck = deck.reverse();
        for (let i = 0; i < 52; i++) {
            columns[i % num_cols].push(deck[i]);
        }
        function render_card(card) {
            const suit = card % 4;
            const rank = Math.floor(card / 4);
            return "A23456789TJQK".charAt(rank) + "CDHS".charAt(suit);
        }
        function render_column(col) {
            return ": " + col.map(render_card).join(" ") + "\n";
        }
        return columns.map(render_column).join("");
    }
});
