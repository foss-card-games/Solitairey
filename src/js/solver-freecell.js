/*
 * Automatically solve a game of Freecell
 */
YUI.add("solver-freecell", function (Y) {
	Y.namespace("Solitaire.Solver.Freecell");

	// only let this work with web workers and typed arrays

	if (!(window.Worker && window.ArrayBuffer && window.Uint8Array)) { return; }

	var Solitaire = Y.Solitaire,
	    FreecellSolver = Solitaire.Solver.Freecell,
	    suitTable = {
		s: 0,
		h: 1,
		c: 2,
		d: 3
	    };

	function cardToValue(card) {
		return card ? card.rank << 2 | suitTable[card.suit] : 0;
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
		return Y.Array.map(field.stacks, function (s) { return s; }).
			sort(function (s1, s2) {
				var c1 = s1.first(),
				    c2 = s2.first();

				return cardToValue(c1) - cardToValue(c2);
			});
	}

	function gameToState(game) {
		var reserve, foundation, tableau;

		tableau = Y.Array.map(sortedStacks(game.tableau), function (s) {
			var buffer = [];

			s.eachCard(function (c, i) {
				buffer[i] = cardToValue(c);
			});

			return [buffer, s.cards.length];
		});

		reserve = [];
		Y.Array.forEach(sortedStacks(game.reserve), function (s, i) {
			reserve[i] = cardToValue(s.last());
		});

		foundation = [];
		Y.Array.forEach(sortedStacks(game.foundation), function (s, i) {
			foundation[i] = cardToValue(s.last());
		});

		return {reserve: reserve, foundation: foundation, tableau: tableau};
	}


	function moveToCardAndStack(game, move) {
		var source = move.source,
		    dest = move.dest,
		    value,
		    ret = {};

		value = source[1];
		game.eachStack(function (stack) {
			if (ret.card) { return; }

			var card = stack.last();
			if (!card) { return; }

			if (card.rank === cardRank(value) &&
			    card.suit === cardSuit(value)) {
				ret.card = card;
			}
		}, source[0]);

		value = dest[1];
		game.eachStack(function (stack) {
			if (ret.stack) { return; }

			var card = stack.last();

			if (!(card || value)) { ret.stack = stack; }

			if (card &&
			    (card.rank === cardRank(value) &&
			    card.suit === cardSuit(value))) {
				ret.stack = stack;
			}
		}, dest[0]);

		return ret;
	}

	function withSelector(selector, callback) {
		var node = Y.one(selector);

		if (node) {
			callback(node);
		}
	}

	var Animation = {
		interval: 500,
		timer: null,
		remainingMoves: null,

		init: function (moves) {
			var current = moves;

			while (current) {
				if (current.next) {
					current.next.prev = current;
				}
				current = current.next;
			}

			this.remainingMoves = moves;
		},

		pause: function () {
			Solitaire.Autoplay.enable();

			window.clearTimeout(this.timer);
			this.timer = null;

			withSelector("#solver_bar .pause", function (node) {
				node.removeClass("pause");
				node.addClass("play");
			});
		},

		playCurrent: function (game) {
			var move,
			    card, origin;

			if (!this.remainingMoves) { return; }

			move = moveToCardAndStack(game, this.remainingMoves);
			card = move.card;

			if (!card) { return; }

			origin = card.stack;

			card.after(function () {
				origin.updateCardsPosition();
				move.stack.updateCardsPosition();
			});
			card.moveTo(move.stack);
		},

		prev: function (game) {
			var prev = this.remainingMoves.prev;

			if (prev) {
				Y.fire("undo", true);
				this.remainingMoves = prev;
			}
		},

		next: function (game) {
			var current = this.remainingMoves,
			    next = this.remainingMoves.next;

			Solitaire.Statistics.disable();
			this.playCurrent(game);

			if (next) {
				this.remainingMoves = next;
			}

			Y.fire("endTurn", true);
		},

		play: function (game) {
			var move,
			    card, origin;

			if (!this.remainingMoves) { return; }

			Solitaire.Autoplay.disable();

			withSelector("#solver_bar .play", function (node) {
				node.removeClass("play");
				node.addClass("pause");
			});

			this.next(game);
			this.timer = window.setTimeout(function () {
				this.play(game);
			}.bind(this), this.interval);
		}
	};

	var Status = {
		bar: null,
		indicator: null,
		indicatorTimer: null,
		indicatorInterval: 750,
		delay: 400,

		updateIndicator: function (ticks) {
			var indicator = this.indicator,
			    i,
			    text;

			if (!indicator) { return; }

			ticks = ((ticks || 0) % 4);
			text = "Solving";
			for (i = 0; i < ticks; i++) {
				text += ".";
			}

			indicator.set("text", text);

			this.indicatorTimer = window.setTimeout(this.updateIndicator.partial(ticks + 1).bind(this), this.indicatorInterval);
		},

		stopIndicator: function (solved) {
			var indicator = this.indicator;

			window.clearTimeout(this.indicatorTimer);
			if (!indicator) { return; }

			if (solved) {
				indicator.set("text", "Solution found");
				withSelector("#solver_bar .controls", function (node) {
					node.removeClass("hidden");
				});

			} else {
				indicator.set("text", "Unable to find solution");
			}

			this.indicatorTimer = null;
		},

		show: function () {
			if (Y.one("#solver_bar")) { return; }

			var bar = Y.Node.create("<div id=solver_bar></div>"),
			    indicator = Y.Node.create("<span class=indicator>"),
			    next = Y.Node.create("<div class=fastforward>"),
			    prev = Y.Node.create("<div class=rewind>"),
			    playPause = Y.Node.create("<div class=play>"),
			    controls = Y.Node.create("<div class='controls hidden'>"),
			    playCallback;

			next.on("click", function () {
				Animation.next(Game);
			});
			prev.on("click", function () {
				Animation.prev(Game);
			});
			playPause.on("click", function () {
				/*
				 * Here I tie up state with the DOM
				 * Maybe thats alright, as its interface state being stored in the interface
				 */

				if (this.hasClass("play")) {
					Animation.play(Game);
				} else if (this.hasClass("pause")) {
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

		hide: function () {
			if (this.bar) {
				this.bar.remove();
			}
		}
	};

	Y.mix(FreecellSolver, {
		currentSolution: null,
		worker: null,
		attached: false,
		supportedGames: ["Freecell"],

		isSupported: function () {
			return this.supportedGames.indexOf(Game.name()) !== -1;
		},

		enable: function () {
			if (this.isSupported()) {
				this.createUI();
			}
			this.attachEvents();
		},

		disable: function () {
			if (this.worker) {
				this.worker.terminate();
			}

			Status.hide();
		},

		attachEvents: function () {
			if (this.attached) { return; }

			var pause = Animation.pause.bind(Animation);

			// start the solver if the current game supports it
			Y.on("afterSetup", function () {
				if (this.isSupported()) {
					this.solve();
				} else {
					this.disable();
				}
			}.bind(this));

			// if a solution isn't currently being played, find a new solution on every new turn
			Y.on("endTurn", function (dontResolve) {
				if (dontResolve || !this.isSupported()) { return; }
				this.solve();
			}.bind(this));

			Y.on("autoPlay", function () {
				FreecellSolver.disable();
			});

			Y.on("win", function () {
				FreecellSolver.disable();
			});

			// human interaction stops playing the current solution
			document.documentElement.addEventListener("mousedown", function (e) {
				if (e.target.className.match(/\bpause\b/)) { return; }
				pause();
			}, true);

			this.attached = true;
		},

		createUI: function () {
			Status.show();
		},

		stop: function () {
			if (this.worker) {
				this.worker.terminate();
			}
		},

		solve: function () {
			this.stop();

			withSelector("#solver_bar .controls", function (node) {
				node.addClass("hidden");
			});

			this.currentSolution = null;
			window.clearTimeout(Status.indicatorTimer);
			Status.indicatorTimer = window.setTimeout(Status.updateIndicator.bind(Status), Status.delay);
            if (false) {
                this.worker = new Worker("js/solver-freecell-worker.js");
                this.worker.onmessage = function (e) {
                    var solution = this.currentSolution = e.data.solution;

                    Animation.init(solution);
                    if (solution) {
                        Status.stopIndicator(true);
                    } else {
                        Status.stopIndicator(false);
                    }
                }.bind(this);
            }

            var state = gameToState(Game);

            function _render_state_as_string (obj) {
                var ret = '';

                function _render_suit (c) {
                    return ['S', 'H', 'C', 'D'][c & 0x3];
                }

                function _render_rank (c) {
                    return ['A', '2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K'][(c >> 2)-1];
                }


                var reserve = obj.reserve;
                var foundation = obj.foundation;
                ret += 'Foundations:' + foundation.map(function (c) {
                    if (c == 0) {
                        return '';
                    }
                    else {
                        return ' ' + _render_suit(c) + '-' + _render_rank(c);
                    }
                }).join('') + "\n";

                ret += 'Freecells:' + reserve.map(function (c) {
                    if (c == 0) {
                        return ' -';
                    } else {
                        return ' ' + _render_rank(c) + _render_suit(c);
                    }
                }).join('') + "\n";

                for (var i = 0; i < obj.tableau.length; i++) {
                    var stack = obj.tableau[i];
                    var l = stack[1];
                    var s = stack[0];

                    ret += ':';
                    for (var j = 0; j < l ; j++) {
                        var c = s[j];
                        ret += ' ' + _render_rank(c) + _render_suit(c);
                    }
                    ret += "\n";
                }

                console.log("Board = <<" + ret + ">>");

                return ret;
            };

            // We need to run this line in order to get FC_Solve working
            // in the worker thread. Don't know why.
            var instance = new FC_Solve({
                cmd_line_preset: 'ct',
                // cmd_line_preset: 'default',
                set_status_callback: function () { return; }
            });

            var state_as_string = _render_state_as_string(state);
            var solve_err_code = instance.do_solve(state_as_string);

            while (solve_err_code == FCS_STATE_SUSPEND_PROCESS) {
                solve_err_code = instance.resume_solution();
            }

            var ret_moves;
            if (solve_err_code == FCS_STATE_WAS_SOLVED) {
                var buffer = instance.display_expanded_moves_solution({});
                var to_int = function(s) { return parseInt(s, 10); };

                var moves_ = instance._post_expand_states_and_moves_seq;

                var current = {};
                var pre_current = current;

                ret_moves = current;
                for (var i = 0; i < moves_.length; i++) {
                    var m = moves_[i];

                    if (m.type == 'm') {
                        var str = m.str;

                        var move_content = (function () {
                            var matched = str.match(/^Move 1 cards from stack ([0-9]+) to stack ([0-9]+)/);


                            if (matched) {
                                return { source: ["tableau", to_int(matched[1])], dest: ["tableau", to_int(matched[2])] };
                            }

                            matched = str.match(/^Move a card from (stack|freecell) ([0-9]+) to the foundations/);

                            if (matched) {
                                return { source: [(matched[1] == "stack" ? "tableau" : "reserve"), to_int(matched[2])], dest: ["foundation", 1] };
                            }

                            matched = str.match(/^Move a card from (stack|freecell) ([0-9]+) to (stack|freecell) ([0-9]+)/);

                            if (matched) {
                                return { source: [(matched[1] == "stack" ? "tableau" : "reserve"), to_int(matched[2])], dest: [(matched[3] == "stack" ? "tableau" : "reserve"), to_int(matched[4])] };
                            }

                            throw "Must not happen";
                        })();

                        pre_current = current;
                        current.source = move_content.source;
                        current.dest = move_content.dest;
                        current.next = {};
                        current = current.next;
                    }
                }
                delete pre_current.next;
            }
            var solution = ret_moves;
            Animation.init(solution);
            if (solution) {
                Status.stopIndicator(true);
            } else {
                Status.stopIndicator(false);
            }

            if (false) {
                this.worker.postMessage({action: "solve", param: state});
            }

		}
	});

	Y.on("beforeSetup", FreecellSolver.enable.bind(FreecellSolver));
}, "0.0.1", {requires: ["solitaire"]});
