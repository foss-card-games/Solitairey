"use strict";
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
    let _startSolution_cb;
    function startSolution(args) {
        return _startSolution_cb(args);
    }
    /*
     * Automatically solve a game of Freecell
     */
    let WITH_UI = false; // Remove UI clutter for the demo.
    WITH_UI = true;

    let _my_module;
    var MAX_MOD_COUNTER = 5;
    var _my_mod_counter = MAX_MOD_COUNTER;
    const suitTable = {
        s: 0,
        h: 1,
        c: 2,
        d: 3,
    };
    function cardToValue(card) {
        return card ? (card.rank << 2) | suitTable[card.suit] : 0;
    }
    function withSelector(Y, selector, callback) {
        var node = Y.one(selector);

        if (node) {
            callback(node);
        }
    }
    function sortedStacks(Y, field) {
        return Y.Array.map(field.stacks, function(s) {
            return s;
        }).sort(function(s1, s2) {
            var c1 = s1.first(),
                c2 = s2.first();

            return cardToValue(c1) - cardToValue(c2);
        });
    }

    function gameToState(Y, game) {
        var reserve, foundation, tableau;

        tableau = Y.Array.map(sortedStacks(Y, game.tableau), function(s) {
            var buffer = [];

            s.eachCard(function(c, i) {
                buffer[i] = cardToValue(c);
            });

            return [buffer, s.cards.length];
        });

        reserve = [];
        Y.Array.forEach(sortedStacks(Y, game.reserve), function(s, i) {
            reserve[i] = cardToValue(s.my_Last());
        });

        foundation = [];
        Y.Array.forEach(sortedStacks(Y, game.foundation), function(s, i) {
            foundation[i] = cardToValue(s.my_Last());
        });

        return {
            reserve: reserve,
            foundation: foundation,
            tableau: tableau,
        };
    }
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
    function _render_foundation(c) {
        if (c == 0) {
            return "";
        } else {
            return " " + _render_suit(c) + "-" + _render_rank(c);
        }
    }
    function cardRank(val) {
        return val >> 2;
    }

    function cardSuit(val) {
        return ["s", "h", "c", "d"][val & 3];
    }

    function _render_freecell(c) {
        if (c == 0) {
            return " -";
        } else {
            return " " + _render_rank(c) + _render_suit(c);
        }
    }

    function _render_state_as_string(obj) {
        var ret = "";

        var reserve = obj.reserve;
        var foundation = obj.foundation;
        ret +=
            "Foundations:" + foundation.map(_render_foundation).join("") + "\n";

        ret += "Freecells:" + reserve.map(_render_freecell).join("") + "\n";

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

    function _init_my_module(callback) {
        if (_my_mod_counter >= MAX_MOD_COUNTER) {
            // Create a fresh instance to avoid failed allocs due to
            // memory fragmentation.
            _my_module = Module()({
                onRuntimeInitialized: () => {
                    w.FC_Solve_init_wrappers_with_module(_my_module);
                    callback();
                },
            });
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
        const ret_moves = [];
        for (let i = 0; i < moves_.length; ++i) {
            const m = moves_[i];

            if (m.type == "m") {
                const move_content = _calc__move_content(
                    moves_[i - 1].str.split("\n"),
                    m.str,
                );

                let current = {};
                current.source = move_content.source;
                current.num_cards = move_content.num_cards;
                current.dest = move_content.dest;
                ret_moves.push(current);
            }
        }
        return ret_moves;
    }
    function _calc_instance_from_state(state) {
        let exceeded_iters = false;
        const instance = new FC_Solve({
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
        let solve_err_code;
        try {
            solve_err_code = instance.do_solve(state_as_string);

            while (
                solve_err_code === FCS_STATE_SUSPEND_PROCESS &&
                !exceeded_iters
            ) {
                solve_err_code = instance.resume_solution();
            }
        } catch (e) {
            console.log("received exception " + e);
            _my_mod_counter = MAX_MOD_COUNTER + 5;
        }
        if (solve_err_code === FCS_STATE_WAS_SOLVED) {
            instance.display_solution({
                displayer: new w.DisplayFilter({
                    is_unicode_cards: false,
                    is_unicode_cards_chars: false,
                }),
            });
            return instance;
        }
        return null;
    }
    function _solve_cb(Y, that, instance, Animation, Status) {
        const solution = instance
            ? _calc__ret_moves(instance._pre_expand_states_and_moves_seq)
            : [];
        Animation.init(solution);
        (function() {
            if (!Y.UA.chrome) {
                return;
            }
            let old = document.body.style.zoom;
            document.body.style.zoom = "80%";
            setTimeout(function() {
                document.body.style.zoom = old;
            }, 10);
        })();
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

            var card = stack.my_Last();

            if (!(card || value)) {
                ret.stack = stack;
            }

            if (
                card &&
                (card.rank === cardRank(value) && card.suit === cardSuit(value))
            ) {
                ret.stack = stack;
            }
        }, dest[0]);

        if (!ret.stack) {
            throw "Must not happen - could not find dest stack for <" +
                value +
                ">";
        }
        // console.log("found for <" + value + ">");

        ret.num_cards = move.num_cards;

        return ret;
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
                FreecellSolver = Solitaire.Solver.Freecell;

            const redeal = Y.one("#redeal");
            if (redeal) {
                redeal.on("click", function() {
                    Solitaire.Application.newGame();
                    //getGame().redeal();
                    return;
                });
            }

            var Animation = {
                interval: 700, // interval: 500,
                timer: null,
                remainingMovesIdx: null,
                remainingMovesArr: [],

                init: function(moves) {
                    this.remainingMovesArr = moves;
                    this.remainingMovesIdx = 0;
                },

                pause: function() {
                    // Solitaire.Autoplay.enable();

                    window.clearTimeout(this.timer);
                    this.timer = null;

                    if (WITH_UI) {
                        /* Remove UI clutter for the demo */ withSelector(
                            Y,
                            "#solver_bar .pause",
                            function(node) {
                                node.removeClass("pause");
                                node.addClass("play");
                                node.set("text", "⏵");
                            },
                        );
                    }
                },

                _playCurrentHelper: function(game) {
                    const that = this;

                    if (
                        that.remainingMovesIdx >= that.remainingMovesArr.length
                    ) {
                        return;
                    }

                    const move = moveToCardAndStack(
                        game,
                        that.remainingMovesArr[that.remainingMovesIdx],
                    );
                    const card = move.card;

                    if (!card) {
                        return;
                    }

                    const origin = card.stack;

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
                    const that = this;
                    if (false) {
                        // window.clearTimeout(that.timer);
                        // that.timer = undefined;
                        Animation.pause();
                        window.setTimeout(function() {
                            Y.fire("newAppGame");
                        }, 2000);
                        // Y.fire("newAppGame");
                    }
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
                    const that = this;
                    if (that.remainingMovesIdx > 0) {
                        Y.fire("undo", true);
                        --that.remainingMovesIdx;
                    }
                },

                next: function(game) {
                    var that = this;
                    var next = this.remainingMovesIdx + 1;

                    Solitaire.Statistics.disable();
                    this.playCurrent(game);

                    that.remainingMovesIdx = next;

                    if (
                        that.remainingMovesIdx >= that.remainingMovesArr.length
                    ) {
                        that._resetGameFoo();
                    }

                    Y.fire("endTurn", true);
                },

                play: function(game) {
                    var move, card, origin;
                    const that = this;

                    if (
                        that.remainingMovesIdx >=
                            that.remainingMovesArr.length ||
                        that.remainingMovesIdx < 0
                    ) {
                        return;
                    }

                    Solitaire.Autoplay.disable();

                    if (WITH_UI) {
                        withSelector(Y, "#solver_bar .play", function(node) {
                            node.removeClass("play");
                            node.addClass("pause");
                            node.set("text", "⏸");
                        });
                    }

                    this.next(game);
                    if (
                        !(
                            that.remainingMovesIdx >=
                                that.remainingMovesArr.length ||
                            that.remainingMovesIdx < 0
                        )
                    ) {
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
                            withSelector(Y, "#solver_bar .controls", function(
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

                    const bar = Y.Node.create(
                        '<nav id="solver_bar" class="controls"></nav>',
                    );
                    const indicator = Y.Node.create(
                        '<span class="indicator"></span>',
                    );
                    const next = Y.Node.create(
                        "<button class='fastforward' title=\"Next move\">⏩︎</button>",
                    );
                    const prev = Y.Node.create(
                        "<button class='rewind' title=\"Previous move\">⏪︎</button>",
                    );
                    const playPause = Y.Node.create(
                        "<button class='play' title=\"Play/Pause\">⏸</button>",
                    );
                    const controls = bar;

                    next.on("click", function() {
                        Animation.pause();
                        Animation.next(getGame());
                    });
                    prev.on("click", function() {
                        Animation.pause();
                        Animation.prev(getGame());
                    });
                    playPause.on("click", function() {
                        const that = this;
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

                    bar.append(indicator);
                    controls.append(prev);
                    controls.append(playPause);
                    controls.append(next);

                    // bar.append(controls);
                    Y.one(".solitairey_body").append(bar);

                    this.indicator = indicator;

                    this.bar = bar;
                },

                hide: function() {
                    if (false) {
                        if (this.bar) {
                            this.bar.remove();
                        }
                    }
                },
            };
            console.log("_startSolution_cb");
            _startSolution_cb = function(args) {
                console.log("called _startSolution_cb");
                Y.Solitaire.Application.switchToGame("freecell");
                Y.Solitaire.Application.clearDOM();
                Y.Solitaire.Freecell.setup(() => {
                    function _from_card(card) {
                        return Y.Solitaire.Freecell.Card.create(
                            card.getRank(),
                            game.deck.suits[[2, 0, 1, 3][card.getSuit()]],
                        ).faceUp();
                    }
                    const board = args.board;
                    const game = getGame();
                    const tableau = game.tableau.stacks;
                    board.columns.forEach((col, ci) => {
                        const column = col.col;
                        tableau[ci].setCards(column.getLen(), function(i) {
                            return _from_card(column.getCard(i));
                        });
                    });
                    const fc = board.freecells;
                    game.reserve.stacks.forEach((stack, i) => {
                        const card = fc ? fc.freecells.getCard(i) : null;
                        stack.setCards(card ? 1 : 0, function(_unused) {
                            return _from_card(card);
                        });
                    });
                    const foundations = board.foundations;
                    game.foundation.stacks.forEach(function(stack, suit) {
                        stack.setCards(
                            foundations
                                ? 1 +
                                      foundations.foundations.getByIdx(
                                          0,
                                          [1, 2, 0, 3][suit],
                                      )
                                : 0,
                            function(rank) {
                                return Y.Solitaire.Freecell.Card.create(
                                    rank,
                                    game.deck.suits[suit],
                                ).faceUp();
                            },
                        );
                    });
                });

                return _solve_cb(
                    Y,
                    FreecellSolver,
                    args.instance,
                    Animation,
                    Status,
                );
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
                                // this.solve();
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
                                // this.solve();
                            }.bind(this),
                        );
                    }

                    Y.on("autoPlay", function() {
                        FreecellSolver.disable();
                    });

                    Y.on("win", function() {
                        // FreecellSolver.disable();
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
                    if (false) {
                        if (WITH_UI) {
                            withSelector(Y, "#solver_bar .controls", function(
                                node,
                            ) {
                                node.addClass("hidden");
                            });
                        }

                        that.currentSolution = null;
                    }
                    window.clearTimeout(Status.indicatorTimer);
                    Status.indicatorTimer = window.setTimeout(
                        Status.updateIndicator.bind(Status),
                        Status.delay,
                    );

                    const state = gameToState(Y, getGame());

                    _init_my_module(() => {
                        window.setTimeout(function() {
                            return _solve_cb(
                                Y,
                                that,
                                _calc_instance_from_state(state),
                                Animation,
                                Status,
                            );
                        }, 400);
                    });
                },
            });

            Y.on("beforeSetup", FreecellSolver.enable.bind(FreecellSolver));
        },
        "0.0.1",
        { requires: ["solitaire"] },
    );
    return { startSolution: startSolution };
});
