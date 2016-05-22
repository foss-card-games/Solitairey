/*
 * Automatically solve a game of Freecell
 */
var WITH_UI = false; // Remove UI clutter for the demo.
YUI.add("solver-freecell", function (Y) {
	Y.namespace("Solitaire.Solver.Freecell");

	// only let this work with typed arrays

	if (!(window.ArrayBuffer && window.Uint8Array)) { return; }

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

		if (! ret.card ) {
			// throw "Excalibur";
			return ret;
		}

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

		if (! ret.stack ) {
			throw "Must not happen";
		}

		return ret;
	}

	function withSelector(selector, callback) {
		var node = Y.one(selector);

		if (node) {
			callback(node);
		}
	}

	var Animation = {
        interval: 700, // interval: 500,
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

			if (WITH_UI) { /* Remove UI clutter for the demo */ withSelector("#solver_bar .pause", function (node) {
				node.removeClass("pause");
				node.addClass("play");
			}); }
		},

		_playCurrentHelper: function (game) {
			var that = this;
			var move,
				card, origin;

			if (!that.remainingMoves) { return; }

			move = moveToCardAndStack(game, that.remainingMoves);
			card = move.card;

			if (!card) { return; }

			origin = card.stack;

			card.after(function () {
				origin.updateCardsPosition();
				move.stack.updateCardsPosition();
			});
			card.moveTo(move.stack);
			return true;
		},

		_resetGameFoo: function () {
			var that = this;
			//window.clearTimeout(that.timer);
			//that.timer = undefined; alert('Applebloom');
			Animation.pause();
			// alert('Applebloom');
			window.setTimeout(function () {
                Y.fire("newAppGame");
            }, 2000);
			// Y.fire("newAppGame");
		},

		playCurrent: function (game) {
			var that = this;
			var verdict = this._playCurrentHelper(game);

			if (! verdict) {
                that._resetGameFoo();
				// Application.newGame();
			}
		},

		prev: function (game) {
			var prev = this.remainingMoves.prev;

			if (prev) {
				Y.fire("undo", true);
				this.remainingMoves = prev;
			}
		},

		next: function (game) {
			var that = this;
			var current = this.remainingMoves,
			    next = this.remainingMoves.next;

			Solitaire.Statistics.disable();
			this.playCurrent(game);

			this.remainingMoves = next; // alert("nexTwilu = <<<" + next + ">>>");

			if (! next) {
				that._resetGameFoo();
			}

			Y.fire("endTurn", true);
		},

		play: function (game) {
			var move,
			    card, origin;

			if (!this.remainingMoves) { return; }

			Solitaire.Autoplay.disable();

			if (WITH_UI) { withSelector("#solver_bar .play", function (node) {
				node.removeClass("play");
				node.addClass("pause");
			}); }

			this.next(game);
			if (this.remainingMoves) {
				this.timer = window.setTimeout(function () {
					this.play(game);
				}.bind(this), this.interval);
			}
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
				if (WITH_UI) { withSelector("#solver_bar .controls", function (node) {
					node.removeClass("hidden");
				}); }

			} else {
				indicator.set("text", "Unable to find solution");
			}

			this.indicatorTimer = null;
		},

		show: function () {

			if (!WITH_UI) { return; } // remove UI clutter for the demo
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
		},

		solve: function () {
			this.stop();

			// Remove UI clutter for the demo.
			if (WITH_UI) { withSelector("#solver_bar .controls", function (node) {
				node.addClass("hidden");
			}); }

			this.currentSolution = null;
			window.clearTimeout(Status.indicatorTimer);
			Status.indicatorTimer = window.setTimeout(Status.updateIndicator.bind(Status), Status.delay);

            var state = gameToState(Game);

            var _suits = ['S', 'H', 'C', 'D'];
            var _ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K'];

            function _rev (arr, delta) {
                var ret = {}
                for (var i = 0; i < arr.length; i++) {
                    ret[arr[i]] = delta+i;
                }
                return ret;
            }
            var _suits_rev = _rev(_suits, 0);
            var _ranks_rev = _rev(_ranks, 1);

            function _str_to_c (s) {
                var m = s.match(/^(.)(.)$/);
                if (! m) {
                    throw "Should not happen";
                }
                return (( _ranks_rev[m[1]] << 2) | _suits_rev[m[2]]);
            }

            function _render_state_as_string (obj) {
                var ret = '';

                function _render_suit (c) {
                    return _suits[c & 0x3];
                }

                function _render_rank (c) {
                    return _ranks[(c >> 2)-1];
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

            var exceeded_iters = false;
	        var instance = new FC_Solve({
                cmd_line_preset: 'video-editing',
                // cmd_line_preset: 'default',
                set_status_callback: function (status) { if (status == 'exceeded') { exceeded_iters = true; } }
            });

            var state_as_string = _render_state_as_string(state);
            var solve_err_code = instance.do_solve(state_as_string);

            while ((solve_err_code == FCS_STATE_SUSPEND_PROCESS) && (!exceeded_iters)) {
                solve_err_code = instance.resume_solution();
            }

            var ret_moves;
            var buffer = instance.display_expanded_moves_solution({});
            if (solve_err_code == FCS_STATE_WAS_SOLVED) {
                var to_int = function(s) { return parseInt(s, 10); };

                var moves_ = instance._post_expand_states_and_moves_seq;

                var current = {};
                var pre_current = current;

                ret_moves = current;
                for (var i = 0; i < moves_.length; i++) {
                    var m = moves_[i];

                    if (m.type == 'm') {
                        var str = m.str;
                        var pre_s = moves_[i-1].str.split("\n");
                        var post_s = moves_[i+1].str.split("\n");

                        function _get_stack_c (src) {
                            var arr = pre_s[src+2].replace(/ *$/, '').split(' ');
                            var src_c_s = arr[arr.length-1];
                            if (src_c_s == ':') {
                                return 0;
                            } else {
                                return  _str_to_c(src_c_s);
                            }
                        }

                        function _get_freecell_c (idx) {
                            var fc_line = pre_s[1];

                            var re = '^Freecells:' + (idx == 0 ? '' : ('(?:....){' + idx + '}')) + '(....)';

                            var pat = new RegExp(re, '');
                            var matched = fc_line.match(pat);

                            if (!matched) {
                                return 0;
                            } else {
                                var c_s = matched[1].substring(2,4);
                                return ((c_s == '  ') ? 0 : _str_to_c(c_s));
                            }
                        }

                        function _get_foundation_rank (f) {
                            var f_line = pre_s[0];
                            var re = f + '-' + '([0A2-9TJQK])';
                            var pat = new RegExp(re, '');
                            var matched = f_line.match(pat);

                            var m = matched[1];
                            return (m == '0' ? 0 : _ranks_rev[m]);
                        }

                        var move_content = (function () {
                            var matched = str.match(/^Move 1 cards from stack ([0-9]+) to stack ([0-9]+)/);

                            if (matched) {
                                var src = to_int(matched[1]);
                                var dest = to_int(matched[2]);
                                var src_c = _get_stack_c(src);
                                var dest_c = _get_stack_c(dest);
                                return { source: ["tableau", src_c], dest: ["tableau", dest_c] };
                            }

                            matched = str.match(/^Move a card from (stack|freecell) ([0-9]+) to the foundations/);

                            if (matched) {
                                var src = to_int(matched[2]);
                                var t = matched[1];

                                var m_t;
                                var src_c;

                                if (t == "stack") {
                                    src_c = _get_stack_c(src);
                                    m_t = "tableau";
                                } else {
                                    src_c = _get_freecell_c(src);
                                    m_t = "reserve";
                                }

                                var f_suit = src_c & 0x3;
                                var f_rank = _get_foundation_rank(_suits[f_suit]);
                                var f_c = ((f_rank == 0) ? false : ((f_rank << 2) | f_suit));

                                return { source: [m_t, src_c], dest: ["foundation", f_c] };
                            }

                            matched = str.match(/^Move a card from stack ([0-9]+) to freecell ([0-9]+)/);

                            if (matched) {
                                return { source: ["tableau", _get_stack_c(to_int(matched[1]))], dest: ["reserve", _get_freecell_c(to_int(matched[2]))] };
                            }

                            matched = str.match(/^Move a card from freecell ([0-9]+) to stack ([0-9]+)/);

                            if (matched) {
                                return { source: ["reserve", _get_freecell_c(to_int(matched[1]))], dest: ["tableau", _get_stack_c(to_int(matched[2]))],  };
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
                window.setTimeout(function () {
                    Animation.play(Game);
                }, 3000);
            } else {
                Status.stopIndicator(false);
                window.setTimeout(function () {
                    Y.fire("newAppGame");
                }, 3000);
            }
		}
	});

	Y.on("beforeSetup", FreecellSolver.enable.bind(FreecellSolver));
}, "0.0.1", {requires: ["solitaire"]});
