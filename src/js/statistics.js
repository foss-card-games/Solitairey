define(["./solitaire"], function (solitaire) {
    const getGame = solitaire.getGame;
    /*
     * record win/lose records, streaks, etc
     */
    YUI.add(
        "statistics",
        function (Y) {
            let loaded,
                won,
                enabled = true;
            const localStorage = window.localStorage,
                Solitaire = Y.Solitaire,
                Statistics = Y.namespace("Solitaire.Statistics");

            if (!localStorage) {
                return;
            }

            Y.on("newGame", function () {
                if (loaded) {
                    recordLose();
                }

                won = false;
                loaded = null;
            });

            Y.on("loadGame", function () {
                loaded = Solitaire.game.name();
                saveProgress();
                won = false;
            });

            Y.on("endTurn", function () {
                if (!loaded) {
                    loaded = Solitaire.game.name();
                    saveProgress();
                }
            });

            Y.on("win", function () {
                if (won || !enabled) {
                    return;
                }

                loaded = null;
                won = true;

                recordWin();

                explodeFoundations();
            });

            Y.on("beforeSetup", function () {
                const winDisplay = Y.one("#win_display");

                winDisplay && winDisplay.remove();
                Statistics.enable();
            });

            function explodeFoundations() {
                const delay = 500,
                    duration = 900,
                    interval = 900;

                getGame().eachStack(function (stack) {
                    stack.eachCard(function (card) {
                        if (!card) {
                            return;
                        }

                        const node = card.node;
                        if (card !== stack.my_Last()) {
                            node.addClass("hidden");
                            return;
                        }

                        node.plug(Y.Breakout, { columns: 5 });
                        (function (node) {
                            setTimeout(function () {
                                node.breakout.explode({
                                    random: 0.65,
                                    duration: duration,
                                });
                            }, delay);
                        })(node);

                        delay += interval;
                    });
                }, "foundation");

                setTimeout(function () {
                    Statistics.winDisplay();
                }, delay + 200);
            }

            /*
             * TODO: a templating system might make this less grody
             */
            function winDisplay() {
                const nameMap = {
                        Agnes: "Agnes",
                        Klondike: "Klondike",
                        Klondike1T: "Klondike (Vegas style)",
                        FlowerGarden: "Flower Garden",
                        FortyThieves: "Forty Thieves",
                        Freecell: "Freecell",
                        Golf: "Golf",
                        GClock: "Grandfather's Clock",
                        MonteCarlo: "Monte Carlo",
                        Pyramid: "Pyramid",
                        RussianSolitaire: "Russian Solitaire",
                        Scorpion: "Scorpion",
                        Spider: "Spider",
                        Spider1S: "Spider (1 Suit)",
                        Spider2S: "Spider (2 Suit)",
                        Spiderette: "Spiderette",
                        WillOTheWisp: "Will O' The Wisp",
                        TriTowers: "Tri Towers",
                        Yukon: "Yukon",
                    },
                    stats = Record(
                        localStorage[Solitaire.game.name() + "record"],
                    );
                let output = "<div id='win_display'>";
                const streakCount = _.last(stats.streaks()).length;
                const winCount = stats.wins().length;
                const loseCount = stats.loses().length;

                output += "<p>You win! You're awesome.</p>";
                output +=
                    "<h2>" + nameMap[Solitaire.game.name()] + " stats:</h2>";
                output += "<ul>";
                output +=
                    "<li>Current win streak: <span class='streak'>" +
                    streakCount +
                    "</span></li>";
                output +=
                    "<li>Total wins: <span class='wins'>" +
                    winCount +
                    "</span></li>";
                output +=
                    "<li>Total loses: <span class='loses'>" +
                    loseCount +
                    "</span></li>";
                output +=
                    '<div class="replay_options"><button class="new_deal">New Deal</button><button class="choose_game">Choose Game</button></div>';

                output += "</ul></div>";

                return output;
            }

            function record(value) {
                const key = localStorage["currentGame"] + "record";
                let record = localStorage[key] || "";

                record += new Date().getTime() + "_" + value + "|";

                localStorage[key] = record;
            }

            function recordLose() {
                record(0);

                clearProgress();
            }

            function recordWin() {
                record(1);

                clearProgress();
            }

            function clearProgress() {
                localStorage.removeItem("currentGame");
            }

            function saveProgress() {
                localStorage["currentGame"] = Solitaire.game.name();
            }

            function Record(raw) {
                function parse() {
                    const entries = raw.split("|");

                    entries.splice(entries.length - 1);

                    return Y.Array.map(entries, function (entry) {
                        entry = entry.split("_");

                        return {
                            date: new Date(entry[0]),
                            won: !!parseInt(entry[1], 10),
                        };
                    });
                }

                function won(entry) {
                    return entry.won;
                }

                const record = parse();

                return {
                    streaks: function () {
                        const streaks = [];
                        let streak = null;

                        Y.Array.each(record, function (entry) {
                            if (!entry.won) {
                                streak && streaks.push(streak);
                                streak = null;
                            } else {
                                if (!streak) {
                                    streak = [];
                                }
                                streak.push(entry);
                            }
                        });

                        streak && streaks.push(streak);

                        return streaks;
                    },

                    wins: function () {
                        return Y.Array.filter(record, won);
                    },

                    loses: function () {
                        return Y.Array.reject(record, won);
                    },
                };
            }

            Y.mix(Statistics, {
                winDisplay: function () {
                    const Application = Solitaire.Application;

                    Y.one(".solitairey_body").append(winDisplay());

                    Y.on(
                        "click",
                        function () {
                            Application.newGame();
                        },
                        Y.one("#win_display .new_deal"),
                    );

                    if (false) {
                        Y.on(
                            "click",
                            function () {
                                Application.GameChooser.show(true);
                            },
                            Y.one("#win_display .choose_game"),
                        );
                    }
                },

                enable: function () {
                    enabled = true;
                },

                disable: function () {
                    enabled = false;
                },
            });
        },
        "0.0.1",
        { requires: ["solitaire", "array-extras", "breakout"] },
    );
    return {};
});
