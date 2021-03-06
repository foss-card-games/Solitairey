define(["./solitaire"], function (solitaire) {
    let newGameRun;
    let schedule;
    let schedule_cb;
    let enable_solitairey_ui = false;
    const enable_cookies = () => {
        return enable_solitairey_ui;
    };
    (function () {
        const active = {
            name: "freecell", // name: "klondike",
            game: null,
        };
        const yui = YUI({ base: "js/yui-unpack/yui/build/" });
        let Y;
        const games = {
            agnes: "Agnes",
            klondike: "Klondike",
            klondike1t: "Klondike1T",
            "flower-garden": "FlowerGarden",
            "forty-thieves": "FortyThieves",
            freecell: "Freecell",
            golf: "Golf",
            "grandfathers-clock": "GClock",
            "monte-carlo": "MonteCarlo",
            pyramid: "Pyramid",
            "russian-solitaire": "RussianSolitaire",
            scorpion: "Scorpion",
            spider: "Spider",
            spider1s: "Spider1S",
            spider2s: "Spider2S",
            spiderette: "Spiderette",
            "tri-towers": "TriTowers",
            "will-o-the-wisp": "WillOTheWisp",
            yukon: "Yukon",
        };
        const extensions = [
            "auto-turnover",
            "statistics",
            // "solver-freecell",
            "solitaire-autoplay",
            // "solitaire-ios"
            // "solitaire-background-fix"
            "solitaire",
        ];
        const Fade = (function () {
            let el = null,
                body;
            const css = {
                    position: "absolute",
                    display: "none",
                    backgroundColor: "#000",
                    opacity: 0.7,
                    top: 0,
                    left: 0,
                    width: 0,
                    height: 0,
                    zIndex: 1000,
                },
                element = function () {
                    if (el === null) {
                        el = Y.Node.create("<div></div>");
                        el.setStyles(css);
                        body = Y.one(".solitairey_body").append(el);
                    }
                    return el;
                };

            return {
                show: function () {
                    const el = element();

                    css.display = "block";
                    css.width = el.get("winWidth");
                    css.height = el.get("winHeight");

                    el.setStyles(css);
                },

                hide: function () {
                    css.display = "none";
                    element().setStyles(css);
                },
            };
        })();
        function switchToGame(name) {
            active.name = name;
            active.game = Y.Solitaire[games[name]];
        }
        function playGame(name) {
            const twoWeeks = 1000 * 3600 * 24 * 14;
            switchToGame(name);

            if (enable_cookies()) {
                $.jStorage.set("FossSolitairey_options", name);
            }
            newGame();
        }
        const GameChooser = {
            selected: null,
            fade: false,

            init: function () {
                this.refit();
            },

            refit: function () {
                const node = Y.one("#game-chooser");
                if (!node) {
                    return;
                }
                const height = node.get("winHeight");

                node.setStyle("min-height", height);
            },

            show: function (fade) {
                if (!this.selected) {
                    this.select(active.name);
                }

                if (fade) {
                    Fade.show();
                    this.fade = true;
                }

                Y.one("#game-chooser").addClass("show");
                Y.one(".solitairey_body").addClass("scrollable");
            },

            hide: function () {
                if (this.fade) {
                    Fade.hide();
                }

                Y.one("#game-chooser").removeClass("show");
                Y.fire("gamechooser:hide", this);
                Y.one(".solitairey_body").removeClass("scrollable");
            },

            choose: function () {
                if (!this.selected) {
                    return;
                }

                this.hide();
                playGame(this.selected);
            },

            select: function (game) {
                const node = Y.one("#" + game + "> div"),
                    previous = this.selected;

                if (previous !== game) {
                    this.unSelect();
                }

                if (node) {
                    this.selected = game;
                    new Y.Node(document.getElementById(game)).addClass(
                        "selected",
                    );
                }

                if (previous && previous !== game) {
                    Y.fire("gamechooser:select", this);
                }
            },

            unSelect: function () {
                if (!this.selected) {
                    return;
                }

                new Y.Node(document.getElementById(this.selected)).removeClass(
                    "selected",
                );
                this.selected = null;
            },
        };

        function modules() {
            const modules = extensions.slice();

            for (const m in games) {
                if (games.hasOwnProperty(m)) {
                    modules.unshift(m);
                }
            }

            return modules;
        }
        /* theres no mechanism yet to load the appropriate deck depending on the scaled card width
         * so we just load the 122x190 cards and call it a day :/
         */
        const Themes = {
            dondorf: {
                sizes: [61, 79, 95, 122],
                61: {
                    hiddenRankHeight: 7,
                    rankHeight: 25,
                    dimensions: [61, 95],
                },

                79: {
                    hiddenRankHeight: 10,
                    rankHeight: 32,
                    dimensions: [79, 123],
                },

                95: {
                    hiddenRankHeight: 12,
                    rankHeight: 38,
                    dimensions: [95, 148],
                },

                122: {
                    hiddenRankHeight: 15,
                    rankHeight: 48,
                    dimensions: [122, 190],
                },
            },

            load: function (name) {
                const Solitaire = Y.Solitaire,
                    base = Solitaire.Card.base;

                if (!(name in this)) {
                    name = "dondorf";
                }

                if (base.theme !== name) {
                    this.set(name, 122);
                }
            },

            set: function (name, size) {
                const theme = this[name][size];

                Y.mix(
                    Y.Solitaire.Card.base,
                    {
                        theme: name + "/" + size,
                        hiddenRankHeight: theme.hiddenRankHeight,
                        rankHeight: theme.rankHeight,
                        width: theme.dimensions[0],
                        height: theme.dimensions[1],
                    },
                    true,
                );
            },
        };

        function loadOptions() {
            if (enable_cookies()) {
                const options = $.jStorage.get("FossSolitairey_options");

                if (options) {
                    active.name = options;
                }
            }

            Themes.load("dondorf");
        }
        function attachResize() {
            let timer;
            const delay = 250;
            let attachEvent;

            if (window.addEventListener) {
                attachEvent = "addEventListener";
            } else if (window.attachEvent) {
                attachEvent = "attachEvent";
            }

            window[attachEvent](
                Y.Solitaire.Application.resizeEvent,
                function () {
                    clearTimeout(timer);
                    timer = setTimeout(resize, delay);
                },
                false,
            );
        }
        function attachEvents() {
            Y.on("newAppGame", function () {
                return newGame();
            });
            if (enable_solitairey_ui) {
                Y.on("click", restart, Y.one("#restart"));
                Y.on(
                    "click",
                    function () {
                        GameChooser.show(false);
                    },
                    Y.one("#choose_game"),
                );
                Y.on("click", newGame, Y.one("#new_deal"));
                Y.on(
                    "click",
                    function () {
                        GameChooser.hide();
                    },
                    Y.one("#close-chooser"),
                );
                Y.on(
                    "click",
                    function () {
                        active.game.undo();
                    },
                    Y.one("#undo"),
                );
            }

            function hideChromeStoreLink() {
                const expires = 1000 * 3600 * 24 * 365; // one year

                const chromestore = Y.one(".chromestore");
                if (chromestore) {
                    chromestore.addClass("hidden");
                }
                if (enable_cookies()) {
                    $.jStorage.set(
                        "FossSolitairey_disable-chromestore-link",
                        true,
                    );
                }
            }
            if (enable_solitairey_ui) {
                Y.on("click", hideChromeStoreLink, Y.one(".chromestore"));

                function showDescription(e) {
                    GameChooser.select(e.currentTarget._node.id);
                    GameChooser.choose();
                }
                Y.delegate("click", showDescription, "#descriptions", "li");
            }
            Y.one("document").on("keydown", function (e) {
                e.keyCode === 27 && GameChooser.hide();
            });

            Y.on("afterSetup", function () {
                active.game.stationary(function () {
                    resize();
                });
            });

            attachResize();
        }
        const Preloader = {
            loadingCount: 0,

            loaded: function (callback) {
                if (this.loadingCount) {
                    setTimeout(
                        function () {
                            this.loaded(callback);
                        }.bind(this),
                        100,
                    );
                } else {
                    const loading = Y.one(".loading");
                    if (loading) {
                        loading.addClass("hidden");
                    }
                    callback();
                    Fade.hide();
                }
            },

            load: function (path) {
                const image = new Image();

                image.onload = function () {
                    --this.loadingCount;
                }.bind(this);
                image.src = path;

                this.loadingCount++;
            },

            preload: function () {
                const that = this;
                let rank;
                const icons = [
                    "agnes",
                    "flower-garden",
                    "forty-thieves",
                    "freecell",
                    "gclock",
                    "golf",
                    "klondike1t",
                    "klondike",
                    "montecarlo",
                    "pyramid",
                    "scorpion",
                    "spider1s",
                    "spider2s",
                    "spiderette",
                    "spider",
                    "tritowers",
                    "will-o-the-wisp",
                    "yukon",
                ];

                ["s", "h", "c", "d"].forEach(function (suit) {
                    for (let rank = 1; rank <= 13; ++rank) {
                        that.load(
                            Y.Solitaire.Card.base.theme +
                                "/" +
                                suit +
                                rank +
                                ".png",
                        );
                    }
                });

                this.load(Y.Solitaire.Card.base.theme + "/facedown.png");

                if (enable_solitairey_ui) {
                    icons.forEach(function (image) {
                        that.load("layouts/mini/" + image + ".png");
                    });
                }

                Fade.show();
                const loading = Y.one(".loading");
                if (loading) {
                    loading.removeClass("hidden");
                }
            },
        };
        function showChromeStoreLink() {
            if (enable_cookies()) {
                if (
                    Y.UA.chrome &&
                    !$.jStorage.get("FossSolitairey_disable-chromestore-link")
                ) {
                    const chromestore = Y.one(".chromestore");
                    if (chromestore) {
                        chromestore.removeClass("hidden");
                    }
                }
            }
        }
        function _my_load_func() {
            const save = enable_cookies()
                ? $.jStorage.get("FossSolitairey_saved-game")
                : false;

            attachEvents();
            loadOptions();

            Preloader.preload();
            Preloader.loaded(function () {
                // showChromeStoreLink();
                if (save) {
                    clearDOM();
                    active.game = Y.Solitaire[games[active.name]];
                    active.game.loadGame(save);
                } else {
                    if (enable_solitairey_ui) {
                        playGame(active.name);
                    }
                }
            });

            GameChooser.init();
            if (schedule_cb) {
                schedule_cb(Y);
            }
        }

        function main(YUI) {
            Y = YUI;

            exportAPI();
            Y.on("domready", _my_load_func);
        }

        function resize() {
            const game = active.game;
            const el = game.container(),
                padding = Y.Solitaire.padding,
                offset = Y.Solitaire.offset,
                width = el.get("winWidth") - padding.x,
                height = el.get("winHeight") - padding.y;

            Y.Solitaire.Application.windowHeight = height;
            const ratio = Math.min(
                (width - offset.left) / game.width(),
                (height - offset.top) / game.height(),
            );

            active.game.resize(ratio);
            GameChooser.refit();
        }

        function clearDOM() {
            Y.all(".stack, .card").remove();
        }

        function restart() {
            if (enable_cookies()) {
                const init = Y.Cookie.get("FossSolitairey_initial-game");

                if (init) {
                    clearDOM();
                    const game = active.game;
                    game.cleanup();
                    game.loadGame(init);
                    game.save();
                }
            }
        }
        function clearGame() {
            const game = active.game;

            clearDOM();
            game.cleanup();
        }

        function newGame() {
            clearGame();
            active.game.newGame();
        }
        newGameRun = function () {
            playGame("freecell");
        };

        function exportAPI() {
            Y.on("newGameRun", newGameRun);
            Y.Solitaire.Application = {
                windowHeight: 0,
                resizeEvent: "resize",
                GameChooser: GameChooser,
                newGame: newGame,
                clearDOM: clearGame,
                switchToGame: switchToGame,
            };
        }
        schedule = function (cb) {
            schedule_cb = cb;
        };

        yui.use.apply(yui, modules().concat(main));
        window.setTimeout(function () {
            yui.use.apply(yui, ["solver-freecell"]);
        }, 400);
    })();

    return {
        schedule: schedule,
        newGameRun: newGameRun,
        setUI: (v) => {
            enable_solitairey_ui = v;
            return;
        },
    };
});
