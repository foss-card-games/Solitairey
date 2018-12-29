define([
    "./libfcs-wrap",
    "./web-fc-solve",
    "./solitaire",
    "./flatted",
], function(Module, w, solitaire, flatted) {
    "use strict";
    var exports = {};
    const FC_Solve = w.FC_Solve;
    const FCS_STATE_SUSPEND_PROCESS = w.FCS_STATE_SUSPEND_PROCESS;
    const FCS_STATE_WAS_SOLVED = w.FCS_STATE_WAS_SOLVED;
    const ENABLE_VALIDATION = true;
    const getGame = solitaire.getGame;
    /*
     * Automatically solve a game of Freecell
     */
    var WITH_UI = false; // Remove UI clutter for the demo.

    var _my_module;
    var MAX_MOD_COUNTER = 5;
    var _my_mod_counter = MAX_MOD_COUNTER;
    function to_int(s) {
        return parseInt(s, 10);
    }
    var _suits = ["S", "H", "C", "D"];

    var _ranks = [
        "A",
        "2",
        "3",
        "4",
        "5",
        "6",
        "7",
        "8",
        "9",
        "T",
        "J",
        "Q",
        "K",
    ];
    function _rev(arr, delta) {
        var ret = {};
        for (var i = 0; i < arr.length; i++) {
            ret[arr[i]] = delta + i;
        }
        return ret;
    }
    var _ranks_rev = _rev(_ranks, 1);
    var _suits_rev = _rev(_suits, 0);
    function _render_rank(c) {
        return _ranks[(c >> 2) - 1];
    }
    function _render_suit(c) {
        return _suits[c & 0x3];
    }

    function _init_my_module() {
        if (_my_mod_counter >= MAX_MOD_COUNTER) {
            // Create a fresh instance to avoid failed allocs due to
            // memory fragmentation.
            _my_module = Module()({});
            w.FC_Solve_init_wrappers_with_module(_my_module);
            _my_mod_counter = 0;
        } else {
            ++_my_mod_counter;
        }

        return;
    }

    function _str_to_c(s) {
        var m = s.match(/^(.)(.)$/);
        if (!m) {
            throw "Should not happen";
        }
        return (_ranks_rev[m[1]] << 2) | _suits_rev[m[2]];
    }
    function _get_stack_c(pre_s, src, card_idx) {
        const arr = pre_s[src + 2].replace(/ *$/, "").split(" ");
        const src_c_s = arr[arr.length - card_idx];
        return src_c_s == ":" ? 0 : _str_to_c(src_c_s);
    }
    function _get_freecell_c(pre_s, idx) {
        const fc_line = pre_s[1];

        const re =
            "^Freecells:" +
            (idx == 0 ? "" : "(?:....){" + idx + "}") +
            "(....)";

        const pat = new RegExp(re, "");
        const matched = fc_line.match(pat);

        if (!matched) {
            return 0;
        } else {
            const c_s = matched[1].substring(2, 4);
            return c_s == "  " ? 0 : _str_to_c(c_s);
        }
    }
    function _get_foundation_rank(pre_s, f) {
        const f_line = pre_s[0];
        const re = f + "-" + "([0A2-9TJQK])";
        const pat = new RegExp(re, "");
        const matched = f_line.match(pat);

        const m = matched[1];
        return m == "0" ? 0 : _ranks_rev[m];
    }
    function _calc__move_content(pre_s, str) {
        var matched = str.match(
            /^Move ([0-9]+) cards from stack ([0-9]+) to stack ([0-9]+)/,
        );

        if (matched) {
            const num_cards = to_int(matched[1]);
            const src_c = _get_stack_c(pre_s, to_int(matched[2]), num_cards);
            const dest_c = _get_stack_c(pre_s, to_int(matched[3]), 1);
            return {
                source: ["tableau", src_c],
                dest: ["tableau", dest_c],
                num_cards: num_cards,
            };
        }

        matched = str.match(
            /^Move a card from (stack|freecell) ([0-9]+) to the foundations/,
        );

        if (matched) {
            const src = to_int(matched[2]);
            let m_t;
            let src_c;

            if (matched[1] == "stack") {
                src_c = _get_stack_c(pre_s, src, 1);
                m_t = "tableau";
            } else {
                src_c = _get_freecell_c(pre_s, src);
                m_t = "reserve";
            }

            const f_suit = src_c & 0x3;
            const f_rank = _get_foundation_rank(pre_s, _suits[f_suit]);
            const f_c = f_rank == 0 ? false : (f_rank << 2) | f_suit;

            return {
                source: [m_t, src_c],
                dest: ["foundation", f_c],
                num_cards: 1,
            };
        }

        matched = str.match(
            /^Move a card from stack ([0-9]+) to freecell ([0-9]+)/,
        );

        if (matched) {
            return {
                source: ["tableau", _get_stack_c(pre_s, to_int(matched[1]), 1)],
                dest: ["reserve", _get_freecell_c(pre_s, to_int(matched[2]))],
                num_cards: 1,
            };
        }

        matched = str.match(
            /^Move a card from freecell ([0-9]+) to stack ([0-9]+)/,
        );

        if (matched) {
            return {
                source: ["reserve", _get_freecell_c(pre_s, to_int(matched[1]))],
                dest: ["tableau", _get_stack_c(pre_s, to_int(matched[2]), 1)],
                num_cards: 1,
            };
        }

        throw "Must not happen - _calc__move_content() failed with <" +
            str +
            ">";
    }
    function _calc__ret_moves(moves_) {
        let current = {};
        let pre_current = current;

        const ret_moves = current;
        for (let i = 0; i < moves_.length; ++i) {
            const m = moves_[i];

            if (m.type == "m") {
                const move_content = _calc__move_content(
                    moves_[i - 1].str.split("\n"),
                    m.str,
                );

                pre_current = current;
                current.source = move_content.source;
                current.num_cards = move_content.num_cards;
                current.dest = move_content.dest;
                current.next = {};
                current = current.next;
            }
        }
        delete pre_current.next;
        return ret_moves;
    }

    YUI.add(
        "solver-freecell",
        function(Y) {
            Y.namespace("Solitaire.Solver.Freecell");

            // only let this work with typed arrays

            if (!(window.ArrayBuffer && window.Uint8Array)) {
                return;
            }

            var Solitaire = Y.Solitaire,
                FreecellSolver = Solitaire.Solver.Freecell,
                suitTable = {
                    s: 0,
                    h: 1,
                    c: 2,
                    d: 3,
                };

            function cardToValue(card) {
                return card ? (card.rank << 2) | suitTable[card.suit] : 0;
            }

            function cardRank(val) {
                return val >> 2;
            }

            function cardSuit(val) {
                return ["s", "h", "c", "d"][val & 3];
            }

            function compareStack(a, b) {
                return b[0] - a[0];
            }

            function sortedStacks(field) {
                return Y.Array.map(field.stacks, function(s) {
                    return s;
                }).sort(function(s1, s2) {
                    var c1 = s1.first(),
                        c2 = s2.first();

                    return cardToValue(c1) - cardToValue(c2);
                });
            }

            function gameToState(game) {
                var reserve, foundation, tableau;

                tableau = Y.Array.map(sortedStacks(game.tableau), function(s) {
                    var buffer = [];

                    s.eachCard(function(c, i) {
                        buffer[i] = cardToValue(c);
                    });

                    return [buffer, s.cards.length];
                });

                reserve = [];
                Y.Array.forEach(sortedStacks(game.reserve), function(s, i) {
                    reserve[i] = cardToValue(s.last());
                });

                foundation = [];
                Y.Array.forEach(sortedStacks(game.foundation), function(s, i) {
                    foundation[i] = cardToValue(s.last());
                });

                return {
                    reserve: reserve,
                    foundation: foundation,
                    tableau: tableau,
                };
            }

            function moveToCardAndStack(game, move) {
                var source = move.source,
                    dest = move.dest,
                    value,
                    ret = { top_card: true };

                value = source[1];
                const source_type = source[0];
                game.eachStack(function(stack) {
                    if (ret.card) {
                        return;
                    }
                    const len = stack.cards.length;

                    stack.eachCard(function(card, i) {
                        if (ret.card) {
                            return false;
                        }
                        if (!card) {
                            return true;
                        }

                        if (
                            card.rank === cardRank(value) &&
                            card.suit === cardSuit(value)
                        ) {
                            ret.card = card;
                            if (source_type === "tableau" && i != len - 1) {
                                ret.top_card = false;
                            }
                            return false;
                        }
                    });
                }, source_type);

                if (!ret.card) {
                    throw "Excalibur";
                    // return ret;
                }

                value = dest[1];
                game.eachStack(function(stack) {
                    if (ret.stack) {
                        return;
                    }

                    var card = stack.last();

                    if (!(card || value)) {
                        ret.stack = stack;
                    }

                    if (
                        card &&
                        (card.rank === cardRank(value) &&
                            card.suit === cardSuit(value))
                    ) {
                        ret.stack = stack;
                    }
                }, dest[0]);

                if (!ret.stack) {
                    throw "Must not happen - could not find dest stack";
                }

                ret.num_cards = move.num_cards;

                return ret;
            }

            function withSelector(selector, callback) {
                var node = Y.one(selector);

                if (node) {
                    callback(node);
                }
            }
            Y.one("#redeal").on("click", function() {
                Solitaire.Application.newGame();
                //getGame().redeal();
                return;
            });

            var Animation = {
                interval: 700, // interval: 500,
                timer: null,
                remainingMoves: null,

                init: function(moves) {
                    var current = moves;

                    while (current) {
                        if (current.next) {
                            current.next.prev = current;
                        }
                        current = current.next;
                    }

                    this.remainingMoves = moves;
                },

                pause: function() {
                    Solitaire.Autoplay.enable();

                    window.clearTimeout(this.timer);
                    this.timer = null;

                    if (WITH_UI) {
                        /* Remove UI clutter for the demo */ withSelector(
                            "#solver_bar .pause",
                            function(node) {
                                node.removeClass("pause");
                                node.addClass("play");
                            },
                        );
                    }
                },

                _playCurrentHelper: function(game) {
                    var that = this;
                    var move, card, origin;

                    if (!that.remainingMoves) {
                        return;
                    }

                    move = moveToCardAndStack(game, that.remainingMoves);
                    card = move.card;

                    if (!card) {
                        return;
                    }

                    origin = card.stack;

                    if (false) {
                        card.after(function() {
                            origin.updateCardsPosition();
                            move.stack.updateCardsPosition();
                        });
                    }
                    if (move.top_card) {
                        card.moveTo(move.stack);
                    } else {
                        Solitaire.activeCard = card;
                        card.createProxyStack();
                        const proxyStack = card.proxyStack;
                        false &&
                            alert(
                                "proxyStack " +
                                    proxyStack.cards
                                        .map((card) => {
                                            _ranks[card.rank] +
                                                _suits[card.suit];
                                        })
                                        .join(" "),
                            );
                        if (proxyStack.cards.length !== move.num_cards) {
                            alert("Error !!! mismatch in num_cards");
                        }
                        // alert("proxyStack " + flatted.stringify(proxyStack));

                        if (false) {
                            getGame().unanimated(function() {
                                proxyStack.updateCardsPosition();
                            });
                        }

                        Y.Array.each(proxyStack.cards, function(card) {
                            if (!card) {
                                return;
                            }

                            // card.proxyStack = null;
                            // fragment.append(card.node);
                        });
                        move.stack.pushStack(proxyStack);
                        move.stack.updateCardsPosition();
                        origin.updateCardsPosition();
                        // origin.deleteItem(card.proxyStack);
                        // origin.deleteItem(card);
                        Solitaire.endTurn();
                    }
                    return true;
                },

                _resetGameFoo: function() {
                    return;
                    var that = this;
                    // window.clearTimeout(that.timer);
                    // that.timer = undefined;
                    Animation.pause();
                    window.setTimeout(function() {
                        Y.fire("newAppGame");
                    }, 2000);
                    // Y.fire("newAppGame");
                },

                playCurrent: function(game) {
                    var that = this;
                    var verdict = this._playCurrentHelper(game);

                    if (!verdict) {
                        that._resetGameFoo();
                        // Application.newGame();
                    }
                },

                prev: function(game) {
                    var prev = this.remainingMoves.prev;

                    if (prev) {
                        Y.fire("undo", true);
                        this.remainingMoves = prev;
                    }
                },

                next: function(game) {
                    var that = this;
                    var current = this.remainingMoves,
                        next = this.remainingMoves.next;

                    Solitaire.Statistics.disable();
                    this.playCurrent(game);

                    this.remainingMoves = next;

                    if (!next) {
                        that._resetGameFoo();
                    }

                    Y.fire("endTurn", true);
                },

                play: function(game) {
                    var move, card, origin;

                    if (!this.remainingMoves) {
                        return;
                    }

                    Solitaire.Autoplay.disable();

                    if (WITH_UI) {
                        withSelector("#solver_bar .play", function(node) {
                            node.removeClass("play");
                            node.addClass("pause");
                        });
                    }

                    this.next(game);
                    if (this.remainingMoves) {
                        this.timer = window.setTimeout(
                            function() {
                                this.play(game);
                            }.bind(this),
                            this.interval,
                        );
                    }
                },
            };

            var Status = {
                bar: null,
                indicator: null,
                indicatorTimer: null,
                indicatorInterval: 750,
                delay: 400,

                updateIndicator: function(ticks) {
                    var indicator = this.indicator,
                        i,
                        text;

                    if (!indicator) {
                        return;
                    }

                    ticks = (ticks || 0) % 4;
                    text = "Solving";
                    for (i = 0; i < ticks; i++) {
                        text += ".";
                    }

                    indicator.set("text", text);

                    this.indicatorTimer = window.setTimeout(
                        this.updateIndicator.partial(ticks + 1).bind(this),
                        this.indicatorInterval,
                    );
                },

                stopIndicator: function(solved) {
                    var indicator = this.indicator;

                    window.clearTimeout(this.indicatorTimer);
                    if (!indicator) {
                        return;
                    }

                    if (solved) {
                        indicator.set("text", "Solution found");
                        if (WITH_UI) {
                            withSelector("#solver_bar .controls", function(
                                node,
                            ) {
                                node.removeClass("hidden");
                            });
                        }
                    } else {
                        indicator.set("text", "Unable to find solution");
                    }

                    this.indicatorTimer = null;
                },

                show: function() {
                    if (!WITH_UI) {
                        return;
                    } // remove UI clutter for the demo
                    const that = this;
                    if (Y.one("#solver_bar")) {
                        return;
                    }

                    var bar = Y.Node.create("<div id=solver_bar></div>"),
                        indicator = Y.Node.create("<span class=indicator>"),
                        next = Y.Node.create("<div class=fastforward>"),
                        prev = Y.Node.create("<div class=rewind>"),
                        playPause = Y.Node.create("<div class=play>"),
                        controls = Y.Node.create(
                            "<div class='controls hidden'>",
                        ),
                        playCallback;

                    next.on("click", function() {
                        Animation.next(getGame());
                    });
                    prev.on("click", function() {
                        Animation.prev(getGame());
                    });
                    playPause.on("click", function() {
                        /*
                         * Here I tie up state with the DOM
                         * Maybe that is alright, as it is interface state
                         * being stored in the interface
                         */

                        if (that.hasClass("play")) {
                            Animation.play(getGame());
                        } else if (that.hasClass("pause")) {
                            Animation.pause();
                        }
                    });

                    controls.append(prev);
                    controls.append(playPause);
                    controls.append(next);

                    bar.append(indicator);
                    bar.append(controls);
                    Y.one("body").append(bar);

                    this.indicator = indicator;

                    this.bar = bar;
                },

                hide: function() {
                    if (this.bar) {
                        this.bar.remove();
                    }
                },
            };

            Y.mix(FreecellSolver, {
                solver_active: false,
                currentSolution: null,
                attached: false,
                supportedGames: ["Freecell"],

                isSupported: function() {
                    return this.supportedGames.indexOf(getGame().name()) !== -1;
                },

                enable: function() {
                    if (this.isSupported()) {
                        this.createUI();
                    }
                    this.attachEvents();
                },

                disable: function() {
                    Status.hide();
                },

                attachEvents: function() {
                    if (this.attached) {
                        return;
                    }

                    var pause = Animation.pause.bind(Animation);

                    // start the solver if the current game supports it
                    Y.on(
                        "afterDealingAnimation",
                        function() {
                            if (this.isSupported()) {
                                this.solve();
                            } else {
                                this.disable();
                            }
                        }.bind(this),
                    );

                    if (false) {
                        // if a solution isn't currently being played,
                        // find a new solution on every new turn
                        Y.on(
                            "endTurn",
                            function(dontResolve) {
                                if (dontResolve || !this.isSupported()) {
                                    return;
                                }
                                this.solve();
                            }.bind(this),
                        );
                    }

                    Y.on("autoPlay", function() {
                        FreecellSolver.disable();
                    });

                    Y.on("win", function() {
                        FreecellSolver.disable();
                    });

                    // human interaction stops playing the current solution
                    document.documentElement.addEventListener(
                        "mousedown",
                        function(e) {
                            if (e.target.className.match(/\bpause\b/)) {
                                return;
                            }
                            pause();
                        },
                        true,
                    );

                    this.attached = true;
                },

                createUI: function() {
                    Status.show();
                },

                stop: function() {},

                solve: function() {
                    const that = this;
                    if (that.solver_active) {
                        return;
                    }
                    that.solver_active = true;
                    that.stop();

                    // Remove UI clutter for the demo.
                    if (WITH_UI) {
                        withSelector("#solver_bar .controls", function(node) {
                            node.addClass("hidden");
                        });
                    }

                    that.currentSolution = null;
                    window.clearTimeout(Status.indicatorTimer);
                    Status.indicatorTimer = window.setTimeout(
                        Status.updateIndicator.bind(Status),
                        Status.delay,
                    );

                    var state = gameToState(getGame());

                    function _render_state_as_string(obj) {
                        var ret = "";

                        var reserve = obj.reserve;
                        var foundation = obj.foundation;
                        ret +=
                            "Foundations:" +
                            foundation
                                .map(function(c) {
                                    if (c == 0) {
                                        return "";
                                    } else {
                                        return (
                                            " " +
                                            _render_suit(c) +
                                            "-" +
                                            _render_rank(c)
                                        );
                                    }
                                })
                                .join("") +
                            "\n";

                        ret +=
                            "Freecells:" +
                            reserve
                                .map(function(c) {
                                    if (c == 0) {
                                        return " -";
                                    } else {
                                        return (
                                            " " +
                                            _render_rank(c) +
                                            _render_suit(c)
                                        );
                                    }
                                })
                                .join("") +
                            "\n";

                        for (var i = 0; i < obj.tableau.length; i++) {
                            var stack = obj.tableau[i];
                            var l = stack[1];
                            var s = stack[0];

                            ret += ":";
                            for (var j = 0; j < l; j++) {
                                var c = s[j];
                                ret += " " + _render_rank(c) + _render_suit(c);
                            }
                            ret += "\n";
                        }

                        if (false) {
                            console.log("Board = <<" + ret + ">>");
                        }

                        return ret;
                    }

                    var exceeded_iters = false;
                    _init_my_module();
                    window.setTimeout(function() {
                        var instance = new FC_Solve({
                            cmd_line_preset: "video-editing",
                            // cmd_line_preset: "lg",
                            // cmd_line_preset: 'as',
                            // cmd_line_preset: 'default',
                            set_status_callback: function(status) {
                                if (status == "exceeded") {
                                    exceeded_iters = true;
                                }
                            },
                        });

                        var state_as_string = _render_state_as_string(state);
                        var ret_moves;
                        try {
                            var solve_err_code = instance.do_solve(
                                state_as_string,
                            );

                            while (
                                solve_err_code == FCS_STATE_SUSPEND_PROCESS &&
                                !exceeded_iters
                            ) {
                                solve_err_code = instance.resume_solution();
                            }

                            var buffer = instance.display_solution({
                                displayer: new w.DisplayFilter({
                                    is_unicode_cards: false,
                                    is_unicode_cards_chars: false,
                                }),
                            });
                            if (solve_err_code == FCS_STATE_WAS_SOLVED) {
                                var moves_ =
                                    instance._pre_expand_states_and_moves_seq;
                                ret_moves = _calc__ret_moves(moves_);
                            }
                        } catch (e) {
                            console.log("received exception " + e);
                            _my_mod_counter = MAX_MOD_COUNTER + 5;
                        }
                        var solution = ret_moves;
                        Animation.init(solution);
                        if (solution) {
                            Status.stopIndicator(true);
                            window.setTimeout(function() {
                                Animation.play(getGame());
                            }, 3000);
                        } else {
                            Status.stopIndicator(false);
                            console.log("no solution");
                            if (false) {
                                window.setTimeout(function() {
                                    Y.fire("newAppGame");
                                }, 3000);
                            }
                        }
                        that.solver_active = false;
                    }, 400);
                },
            });

            Y.on("beforeSetup", FreecellSolver.enable.bind(FreecellSolver));
        },
        "0.0.1",
        { requires: ["solitaire"] },
    );
});
