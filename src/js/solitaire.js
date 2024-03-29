define([], function () {
    let enable_solitairey_ui = false;
    const enable_cookies = () => {
        return enable_solitairey_ui;
    };
    const _delete_saved_game = () => {
        if (enable_cookies()) {
            $.jStorage.deleteKey("FossSolitairey_saved-game");
        }
        return;
    };
    // For debugging.
    // var pre_canned_seeds = [11982, 11982, 11982, 11982];
    const pre_canned_seeds = [];

    function my_Flatten(arr) {
        const result = [];
        const proto = Array.prototype;
        const len = arr.length;

        for (let i = 0; i < len; i++) {
            const item = arr[i];
            if (Object.prototype.toString.call(item) === "[object Array]") {
                proto.push.apply(result, my_Flatten(item));
            } else {
                result.push(item);
            }
        }
        return result;
    }

    function argsArray(args) {
        return Array.prototype.slice.call(args);
    }

    function _deleteItem(arr, item) {
        const i = arr.indexOf(item);

        i !== -1 && arr.splice(i, 1);
    }
    function my_Shuffle(arr) {
        let i = arr.length,
            r,
            item,
            temp;

        while (--i) {
            r = ~~(Math.random() * i);
            item = arr[i];
            temp = arr[r];
            arr[r] = item;
            arr[i] = temp;
        }
    }
    function instance(proto, attrs) {
        const maker = new Function();

        maker.prototype = proto;
        const o = new maker();
        if (typeof attrs === "object") {
            for (const p in attrs) {
                if (attrs.hasOwnProperty(p)) {
                    o[p] = attrs[p];
                }
            }
        }

        return o;
    }

    function normalize(valOrFunction) {
        const val =
            typeof valOrFunction === "function"
                ? valOrFunction()
                : valOrFunction;

        return isNaN(val) ? undefined : val;
    }

    function mapToFloat(that) {
        for (const p in that) {
            if (that.hasOwnProperty(p)) {
                that[p] = parseFloat(that[p]);
            }
        }

        return that;
    }

    mapAppend = function (that, str) {
        for (const p in that) {
            if (that.hasOwnProperty(p)) {
                that[p] += str;
            }
        }

        return that;
    };

    let Game;

    function getGame() {
        return Game;
    }

    YUI.add(
        "solitaire",
        function (Y) {
            const Solitaire = Y.namespace("Solitaire");

            function CardDelegate(cfg) {
                CardDelegate.superclass.constructor.call(this, cfg);
            }

            Y.extend(CardDelegate, Y.DD.Delegate, {
                getCard: function () {
                    return this.get("currentNode").getData("target");
                },
            });

            Y.mix(Solitaire, {
                activeCard: null,
                getGame: getGame,
                instance: instance,
                moves: null,
                selector: ".solitairey_body",
                offset: { left: 50, top: 70 },
                padding: { x: 50, y: 50 },
                widthScale: 0,

                noop: function () {},

                name: function () {
                    for (const p in Solitaire) {
                        if (
                            Solitaire.hasOwnProperty(p) &&
                            Solitaire[p] === Game
                        ) {
                            return p;
                        }
                    }
                },

                container: function () {
                    return Y.one(Solitaire.selector);
                },

                width: function () {
                    return this.Card.base.width * this.widthScale;
                },
                height: function () {
                    return this.Card.base.height * 4.2;
                },
                maxStackHeight: function () {
                    return (
                        Solitaire.Application.windowHeight -
                        normalize(this.Tableau.stackConfig.layout.top) -
                        Solitaire.offset.top
                    );
                },

                undo: function () {
                    Y.fire("undo");
                },

                pushMove: function (move) {
                    const moves = Solitaire.moves;
                    moves && moves.push(move);
                },

                serialize: function () {
                    const that = this;
                    const serialized = [],
                        lengths = [];

                    that.fields.forEach(function (field) {
                        const stacks = that[field.toLowerCase()].stacks;

                        for (let i = 0, len = stacks.length; i < len; i++) {
                            const data = stacks[i].serialize();
                            serialized.push(data);
                            lengths.push(String.fromCharCode(data.length));
                        }
                    });

                    return [String.fromCharCode(serialized.length)]
                        .concat(lengths, serialized)
                        .join("");
                },

                stationary: function (callback) {
                    const updatePosition = Game.Card.updatePosition;

                    Game.Card.updatePosition = Solitaire.noop;
                    callback.call(this);
                    Game.Card.updatePosition = updatePosition;
                },

                unanimated: function (callback) {
                    const anim = Y.Solitaire.Animation,
                        animate = anim.animate;

                    anim.animate = false;
                    callback.call(this);
                    anim.animate = animate;
                },

                unserialize: function (serialized) {
                    const that = this;
                    that.unanimated(function () {
                        const numStacks = serialized.charCodeAt(0),
                            lengths = serialized.substr(1, numStacks),
                            fields = that.fields;
                        let data,
                            stackIndex,
                            stack,
                            i,
                            length,
                            offset = numStacks + 1,
                            stacks = [],
                            fieldIndex = -1;

                        for (
                            i = 0, stackIndex = 0;
                            i < numStacks;
                            i++, stackIndex++, offset += length
                        ) {
                            length = lengths.charCodeAt(i);
                            data = serialized.substr(offset, length);

                            if (stackIndex === stacks.length) {
                                fieldIndex++;
                                stacks =
                                    that[fields[fieldIndex].toLowerCase()]
                                        .stacks;
                                stackIndex = 0;
                            }

                            stack = stacks[stackIndex];
                            stack.unserialize(data);
                            stack.updateCardsPosition();
                        }
                    });
                },

                save: function (name) {
                    const data = this.serialize(),
                        twoWeeks = 1206900000;

                    if (enable_cookies()) {
                        $.jStorage.set(
                            "FossSolitairey_" + (name || "saved-game"),
                            data,
                        );
                    }
                },

                loadGame: function (data) {
                    const that = this;
                    that.unanimated(function () {
                        that.setup(function () {
                            that.unserialize(data);
                        });
                    });

                    Y.fire("loadGame");
                },

                newGame: function () {
                    _delete_saved_game();
                    const that = this;
                    if (enable_solitairey_ui) {
                        that.setup(that.deal);
                    } else {
                        // set up the cards layout here.
                        that.setup(function () {
                            let card,
                                stack = 0;
                            const stacks = that.tableau.stacks;

                            while ((card = that.deck.pop())) {
                                stacks[stack].push(card.faceUp());
                                if (++stack === 8) {
                                    stack = 0;
                                }
                            }

                            return;
                        });
                    }

                    Game.save("initial-game");

                    Y.fire("newGame");
                },

                cleanup: function () {
                    Y.Event.purgeElement(this.container());

                    // remove custom events
                    Y.detach("solitaire|*");

                    this.eachStack(function (stack) {
                        stack.cleanup();
                    });
                },

                setup: function (callback, args) {
                    Game = Solitaire.game = this;

                    Y.fire("beforeSetup");

                    Solitaire.moves = null;
                    Undo.clear();

                    this.stationary(function () {
                        const seed = pre_canned_seeds.length
                            ? pre_canned_seeds.shift()
                            : Math.floor(
                                  1 + Math.random() * (((1 << 30) - 2) << 1),
                              );
                        const deal_num = Y.one("#deal_num_shlomify");
                        if (deal_num) {
                            deal_num.set("value", seed);
                        }
                        Game.seed = seed;
                        Game.init(seed);
                        Y.Solitaire.Animation.initQueue();
                        Game.createStacks();
                        Game.createEvents();
                        if (!(args && args.disableDragging)) {
                            Game.createDraggables();
                        }
                        callback.call(Game);
                    });

                    Solitaire.moves = [];
                    Y.fire("afterSetup");

                    const animate = Y.Solitaire.Animation.animate;
                    Y.Solitaire.Animation.animate = false;
                    Y.Solitaire.Animation.dealing = false;

                    Game.eachStack(function (s) {
                        s.updateCardsStyle();
                        s.updateCardsPosition();
                    });

                    Y.Solitaire.Animation.dealing = false;
                    Y.Solitaire.Animation.animate = animate;
                    Y.fire("afterDealingAnimation");
                },

                createEvents: function () {
                    const container = Y.one(Solitaire.selector);
                    if (false) {
                        container.delegate("dblclick", Game.autoPlay, ".card");
                        container.delegate(
                            "contextmenu",
                            Game.autoPlay,
                            ".card",
                        );

                        container.delegate("click", Game.Events.click, ".card");
                        container.delegate(
                            "touchend",
                            Game.Events.click,
                            ".card",
                        );
                    }

                    Y.on("solitaire|endTurn", Game.Events.endTurn);
                    Y.on("solitaire|undo", Game.Events.undo);
                },

                createDraggables: function () {
                    const del = new CardDelegate({
                        dragConfig: {
                            dragMode: "intersect",
                            groups: ["open"],
                            clickPixelThresh: 0,
                        },
                        container: Solitaire.selector,
                        nodes: ".card",
                    });

                    del.dd.plug(Y.Plugin.DDProxy, {
                        borderStyle: "none",
                        moveOnEnd: false,
                    });

                    del.on("drag:drag", Game.Events.drag);
                    del.on("drag:mouseDown", Game.Events.dragCheck);
                    del.on("drag:start", Game.Events.dragStart);
                    del.on("drag:dropmiss", Game.Events.dragMiss);
                    del.on("drag:drophit", Game.Events.drop);
                    del.on("drag:end", Game.Events.dragEnd);
                },

                createField: function (field) {
                    if (!field) {
                        return;
                    }

                    const f = instance(field);
                    let stackLayout, stack, stacks, i, len;

                    if (field.stackConfig) {
                        stackLayout = field.stackConfig.layout;
                        stacks = new Array(field.stackConfig.total);
                        field.Stack.field = field.field;

                        for (i = 0, len = stacks.length; i < len; i++) {
                            stack = instance(field.Stack);
                            stack.configLayout = stackLayout;

                            stack.layout(
                                Y.merge(stackLayout, {
                                    hoffset: i * stackLayout.hspacing || 0,
                                    voffset: i * stackLayout.vspacing || 0,
                                }),
                                i,
                            );

                            stacks[i] = stack;
                        }
                    }

                    f.stacks = stacks;

                    typeof f.init === "function" && f.init(this.seed);

                    return f;
                },

                createStacks: function () {
                    this.eachStack(function (stack) {
                        stack.cards = [];
                        stack.createNode();
                    });
                },

                eachStack: function (callback, fieldName) {
                    if (Game) {
                        Game.fields.forEach(function (name) {
                            const currentName = name.toLowerCase(),
                                field = Game[currentName],
                                fname = fieldName || currentName;

                            if (fname === currentName && field.stacks) {
                                field.stacks.forEach(callback);
                            }
                        });
                    }
                },

                resize: function (scale) {
                    const that = this;
                    Y.fire("beforeResize");

                    that.scale(scale);

                    that.unanimated(function () {
                        that.eachStack(function (stack, i) {
                            const cards = stack.cards,
                                layout = stack.configLayout;

                            stack.adjustRankHeight();
                            stack.cards = [];
                            stack.layout(
                                Y.merge(layout, {
                                    hoffset: i * layout.hspacing || 0,
                                    voffset: i * layout.vspacing || 0,
                                }),
                                i,
                            );

                            stack.updateStyle();

                            stack.setCards(cards.length, function (i) {
                                const card = cards[i];

                                card && card.updateStyle();
                                return card;
                            });

                            stack.update();
                        });
                    });

                    Y.fire("afterResize");
                },

                scale: function (scale) {
                    const Card = Y.Solitaire.Card,
                        base = Card.base;

                    Card.scale = scale;

                    for (const prop in base) {
                        if (base.hasOwnProperty(prop)) {
                            Card[prop] = base[prop] * scale;
                        }
                    }
                },

                init: function () {
                    const cancel = Solitaire.preventDefault;

                    if (false) {
                        Y.on("selectstart", cancel, document);
                        Y.on("mousedown", cancel, document.body);
                        Y.on(
                            "contextmenu",
                            function (e) {
                                const target = e.target;

                                if (
                                    target.hasClass("stack") ||
                                    target.hasClass("card")
                                ) {
                                    e.preventDefault();
                                }
                            },
                            document,
                        );
                    }

                    this.scale(1);

                    const fields = Y.Array.map(Game.fields, function (field) {
                        return (Game[field.toLowerCase()] = Game.createField(
                            Game[field],
                        ));
                    });

                    // TODO: refactor this conditional into the above iteration
                    if (Game.fields.indexOf("Deck" === -1)) {
                        Game.deck = Game.createField(Game.Deck);
                    }
                    const vals = my_Flatten(
                        Y.Array.map(fields, function (f) {
                            return Y.Array.map(f.stacks, function (s) {
                                return s.left;
                            });
                        }),
                    );

                    // find the game/card width ratio
                    const minX = Math.min.apply(Math, vals);

                    const maxX = Math.max.apply(Math, vals) + this.Card.width;

                    this.widthScale = (maxX - minX) / this.Card.base.width;
                },

                preventDefault: function (e) {
                    e.preventDefault();
                },

                autoPlay: function () {
                    const card =
                        typeof this.getCard === "function"
                            ? this.getCard()
                            : this.getData("target");

                    card.autoPlay();
                },

                isWon: function () {
                    const foundations = this.foundation.stacks,
                        deck = this.deck;
                    let placed = 0,
                        i,
                        len;

                    const total = deck.suits.length * 13 * deck.count;
                    for (i = 0, len = foundations.length; i < len; i++) {
                        placed += foundations[i].cards.length;
                    }

                    return placed === total;
                },

                win: function () {
                    Y.fire("win");
                    _delete_saved_game();
                },

                endTurn: function () {
                    Y.fire("endTurn");
                },
            });

            Y.Solitaire.Events = {
                /*
                click: function(e) {
                    var card = e.target.getData("target");

                    if (card.dragging) {
                        return;
                    }

                    card.dragging = false;
                    card.turnOver(e);
                    Solitaire.moves.reverse();
                    Solitaire.endTurn();
                    e.preventDefault();
                },*/

                clickEmptyDeck: function () {
                    Game.redeal();
                    Solitaire.moves.reverse();
                    Solitaire.endTurn();
                },

                drag: function () {
                    this.getCard().dragging = true;
                },

                dragCheck: function () {
                    const card = this.getCard(),
                        stack = card.createProxyStack();

                    if (!stack) {
                        return;
                    }

                    Solitaire.activeCard = card;

                    Game.eachStack(function (stack) {
                        stack.updateDragGroups();
                    });
                },

                dragStart: function () {
                    const card = this.getCard(),
                        node = this.get("dragNode"),
                        proxy = card.createProxyNode();

                    if (proxy) {
                        node.setContent(proxy);
                        !card.proxyStack &&
                            Y.one(".yui3-dd-shim").setStyle(
                                "cursor",
                                "not-allowed",
                            );
                    }
                },

                dragMiss: function () {
                    const card = this.getCard();

                    Game.unanimated(function () {
                        card.updatePosition();
                    });
                },

                dragEnd: function () {
                    const target = this.getCard(),
                        root = Solitaire.container(),
                        fragment = new Y.Node(
                            document.createDocumentFragment(),
                        ),
                        dragXY = this.dd.realXY,
                        containerXY = root.getXY(),
                        proxyStack = target.proxyStack;

                    target.dragging = false;
                    const dragNode = this.get("dragNode");
                    const node = dragNode.get("firstChild");

                    node && node.remove();

                    if (!proxyStack) {
                        return;
                    }

                    const cards = proxyStack.cards;
                    const stack = target.stack;

                    proxyStack.left = dragXY[0] - containerXY[0];
                    proxyStack.top = dragXY[1] - containerXY[1];

                    Game.unanimated(function () {
                        proxyStack.updateCardsPosition();
                    });

                    cards.forEach(function (card) {
                        if (!card) {
                            return;
                        }

                        card.proxyStack = null;
                        fragment.append(card.node);
                    });

                    root.append(fragment);

                    stack.updateCardsPosition();
                },

                drop: function (e) {
                    if (!Solitaire.activeCard) {
                        return;
                    }

                    const card = Solitaire.activeCard,
                        stack = card.proxyStack;

                    if (stack) {
                        const first = stack.first();

                        let target = e.drop.get("node").getData("target");

                        target = target.stack || target;

                        if (
                            (stack.cards.length === 1 &&
                                first.validTarget(target)) ||
                            stack.validTarget(target)
                        ) {
                            target.pushStack(stack);
                        }
                    }

                    Solitaire.endTurn();
                },

                endTurn: function () {
                    Solitaire.moves.length && Undo.push(Solitaire.moves);
                    Solitaire.moves = [];
                    Solitaire.activeCard = null;
                    Game.eachStack(function (s) {
                        s.updateCardsStyle();
                    });

                    if (Game.isWon()) {
                        Game.win();
                    } else {
                        Game.save();
                    }
                },

                undo: function (...rest) {
                    const args = argsArray(rest);

                    args.unshift("endTurn");
                    Undo.undo();
                    Y.fire.apply(Y, args);
                },
            };

            Y.Solitaire.Deck = {
                count: 1,
                suits: ["c", "d", "h", "s"],

                init: function (seed) {
                    const suits = this.suits;
                    let suit, s, rank, count;
                    const Card = Game.Card;

                    this.cards = [];

                    for (count = 0; count < this.count; count++) {
                        for (rank = 1; rank <= 13; rank++) {
                            for (s = 0; (suit = suits[s]); s++) {
                                this.cards.push(
                                    Card.create(rank, suit).faceDown(),
                                );
                            }
                        }
                    }

                    if (seed === undefined) {
                        my_Shuffle(this.cards);
                    } else {
                        this.msSeededShuffle(seed);
                    }
                },

                // shuffle the deck using the "Microsoft Number"
                msSeededShuffle: function (seed) {
                    const cards = this.cards,
                        maxInt = Math.pow(2, 31);
                    let rand, temp, i;

                    for (i = cards.length; i > 1; --i) {
                        // simulate x86 integer overflow
                        seed = (((214013 * seed) % maxInt) + 2531011) % maxInt;
                        rand = (seed >> 16) & 0x7fff;

                        item = cards[i - 1];
                        temp = cards[rand % i];
                        cards[i - 1] = temp;
                        cards[rand % i] = item;
                    }
                },

                createStack: function () {
                    for (let i = this.cards.length - 1; i >= 0; i--) {
                        this.stacks[0].push(this.cards[i]);
                    }
                },

                my_Last: function () {
                    return _.last(this.cards);
                },

                pop: function () {
                    return this.cards.pop();
                },
            };

            Y.Solitaire.Card = {
                zIndex: 1,
                index: -1,
                width: null,
                height: null,
                rankHeight: null,
                hiddenRankHeight: null,
                isFaceDown: false,
                positioned: false,
                scale: 1,
                stack: null,
                proxyStack: null,
                ghost: true,
                dragging: false,
                node: null,
                callback: null,
                left: 0,
                top: 0,

                base: {},

                origin: {
                    left: function () {
                        const offset = Solitaire.container().getXY()[0];

                        return -offset - Y.Solitaire.Card.width;
                    },
                    top: function () {
                        const offset = Solitaire.container().getXY()[1];

                        return -offset - Y.Solitaire.Card.height;
                    },
                },

                animSpeeds: { slow: 0.5, mid: 0.2, fast: 0.1 },

                create: function (rank, suit) {
                    const colors = { c: 0, s: 0, h: 1, d: 1 };

                    return instance(this, {
                        rank: rank,
                        suit: suit,
                        color: colors[suit],
                    });
                },

                truncatePosition: function () {
                    this.left = Math.floor(this.left);
                    this.top = Math.floor(this.top);
                },

                faceDown: function (undo) {
                    this.isFaceDown = true;
                    this.setRankHeight();
                    this.setImageSrc();

                    undo || Solitaire.pushMove({ card: this, faceDown: true });

                    return this;
                },

                faceUp: function (undo) {
                    this.isFaceDown = false;
                    this.setRankHeight();
                    this.setImageSrc();

                    undo || Solitaire.pushMove({ card: this, faceDown: false });

                    return this;
                },

                setRankHeight: function () {
                    const stack = this.stack;
                    let rh, hh;

                    if (stack && stack.rankHeight) {
                        rh = stack.rankHeight;
                        hh = stack.hiddenRankHeight;
                    } else {
                        rh = Solitaire.Card.rankHeight;
                        hh = Solitaire.Card.hiddenRankHeight;
                    }

                    this.rankHeight = this.isFaceDown ? hh : rh;
                },

                imageSrc: function () {
                    let src = this.base.theme + "/";

                    src += this.isFaceDown ? "facedown" : this.suit + this.rank;

                    src += ".png";

                    return src;
                },

                setImageSrc: function () {
                    const n = this.node;

                    n && n.setAttribute("src", this.imageSrc());
                },

                wrapperStyle: function () {
                    return {
                        left: this.left,
                        top: this.top,
                        width: Math.floor(this.width),
                        height: Math.floor(this.height),
                    };
                },

                updateStyle: function () {
                    const n = this.node;

                    n && n.setStyles(this.wrapperStyle());
                    this.setRankHeight();
                },

                turnOver: function (e) {
                    if (!this.isFaceDown) {
                        return;
                    }

                    const stack = this.stack;

                    if (stack.field === "deck") {
                        Game.turnOver();
                    } else if (this.isFree()) {
                        this.faceUp();
                    }

                    e.stopPropagation();
                },

                autoPlay: function () {
                    const origin = this.stack,
                        last = origin.my_Last();
                    let foundation, i, len;

                    if (this.isFaceDown || origin.field === "foundation") {
                        return;
                    }

                    const stacks = Game.foundation.stacks;
                    for (i = 0, len = stacks.length; i < len; i++) {
                        foundation = stacks[i];
                        if (this.isFree() && this.validTarget(foundation)) {
                            this.moveTo(foundation);
                            origin.updateCardsPosition();
                            origin.update();

                            Solitaire.endTurn();
                            return true;
                        }
                    }

                    return false;
                },

                ensureDOM: function () {
                    !this.node && this.createNode();
                },

                isFree: function () {
                    return this === this.stack.my_Last();
                },

                playable: function () {
                    return (
                        this.stack.field === "deck" ||
                        (this.isFree() && this.stack.field !== "foundation")
                    );
                },

                createNode: function () {
                    let groups;
                    const card = this;

                    const node = (this.node = Y.Node.create(
                        "<img class='card' />",
                    )
                        .setData("target", this)
                        .setAttribute("src", this.imageSrc())
                        .plug(Y.Plugin.Drop, {
                            useShim: false,
                        }));

                    node.setStyles({ left: -this.width, top: -this.height });
                    // this.updateStyle();
                    this.setRankHeight();

                    Solitaire.container().append(node);
                },

                destroyNode: function () {
                    const n = this.node;

                    n && n.clearData().destroy(true);
                },

                createProxyStack: function () {
                    if (this.isFaceDown || this.stack.field === "foundation") {
                        this.proxyStack = null;
                        return null;
                    }

                    const stack = instance(this.stack, {
                            proxy: true,
                            stack: this.stack,
                        }),
                        cards = stack.cards;
                    let i, len;

                    stack.cards = [];
                    stack.push(this, true);

                    for (
                        i = cards.indexOf(this) + 1, len = cards.length;
                        i < len;
                        i++
                    ) {
                        const card = cards[i];
                        if (stack.validProxy(card)) {
                            stack.push(card, true);
                        } else {
                            break;
                        }
                    }

                    this.proxyStack = i === len ? stack : null;

                    return this.proxyStack;
                },

                proxyCards: function () {
                    return this.proxyStack.cards;
                },

                createProxyNode: function () {
                    const node = Y.Node.create("<div></div>"),
                        stack = this.proxyStack;

                    // if the card isn't playable, create ghost copy
                    if (!stack) {
                        if (!this.ghost) {
                            return null;
                        }

                        node.setStyles({
                            opacity: 0.6,
                            top: -this.top,
                            left: -this.left,
                        }).append(this.node.cloneNode(true));
                    } else {
                        node.setStyles({
                            opacity: 1,
                            top: -this.top,
                            left: -this.left,
                        });

                        this.proxyCards().forEach(function (c) {
                            c.proxyStack = stack;
                            node.append(c.node);
                        });
                    }

                    return node;
                },

                updatePosition: function (fields) {
                    if (!this.node) {
                        return;
                    }

                    const to = {
                            left: this.left + "px",
                            top: this.top + "px",
                            zIndex: this.zIndex,
                        },
                        origin = this.origin;

                    if (!this.positioned) {
                        this.node.setStyles({
                            left: normalize(origin.left),
                            top: normalize(origin.top),
                        });
                    }

                    Y.Solitaire.Animation.init(this, to, fields);
                },

                pushPosition: function () {
                    const index =
                        this.index >= 0
                            ? this.index
                            : this.stack.cards.indexOf(this);

                    Solitaire.pushMove({
                        card: this,
                        index: index,
                        from: this.stack,
                    });
                },

                moveTo: function (stack) {
                    const origin = this.stack;

                    this.pushPosition();
                    origin.deleteItem(this);
                    stack.push(this);

                    Y.fire(origin.field + ":afterPop", origin);

                    return this;
                },

                after: function (callback) {
                    this.callback = callback;
                },

                runCallback: function () {
                    if (this.callback) {
                        this.callback.call(this);
                        this.callback = null;
                    }
                },
            };

            Y.Solitaire.Stack = {
                cards: null,
                node: null,
                images: {
                    tableau: "freeslot.png",
                    deck: "freeslot.png",
                    reserve: "freeslot.png",
                    foundation: "freeslot.png",
                },

                serialize: function () {
                    let i, len, card, bite;
                    const cards = this.cards,
                        serialized = [],
                        suits = Game.deck.suits;
                    for (i = 0, len = cards.length; i < len; i++) {
                        card = cards[i];
                        if (card) {
                            bite =
                                suits.indexOf(card.suit) |
                                (card.rank << 2) |
                                (card.isFaceDown << 6); // type coersion!
                        } else {
                            bite = 128;
                        }
                        serialized.push(String.fromCharCode(bite));
                    }

                    return serialized.join("");
                },

                eachCard: function (callback) {
                    let i, len;
                    const cards = this.cards;

                    for (i = 0, len = cards.length; i < len; i++) {
                        if (cards[i]) {
                            if (callback.call(this, cards[i], i) === false) {
                                return false;
                            }
                        }
                    }

                    return true;
                },

                setCards: function (count, cardGen) {
                    let i, len, card;
                    const empty = instance(Game.Card, {
                        updatePosition: Solitaire.noop,
                        ensureDOM: Solitaire.noop,
                    });

                    const cards = (this.cards = []);

                    for (i = 0; i < count; i++) {
                        card = cardGen.call(this, i) || empty;
                        this.push(card);
                    }

                    for (i = 0; i < count; i++) {
                        if (cards[i] === empty) {
                            cards[i] = null;
                        }
                    }
                },

                updateCardsPosition: function () {
                    const cards = this.cards;

                    Game.stationary(
                        function () {
                            const that = this;
                            this.proxy || this.adjustRankHeight();
                            this.setCards(cards.length, function (i) {
                                const card = cards[i];

                                if (card) {
                                    card.stack = that;
                                    card.setRankHeight();
                                }

                                return card;
                            });
                        }.bind(this),
                    );

                    this.eachCard(function (c) {
                        c.updatePosition();
                    });
                },

                updateCardsStyle: function () {
                    const field = this.field;

                    field === "foundation" ||
                        this.eachCard(function (c) {
                            if (c.playable()) {
                                c.node.addClass("playable");
                            } else {
                                c.node.removeClass("playable");
                            }
                        });
                },

                unserialize: function (serialized) {
                    const deck = Game.deck,
                        Card = Game.Card;

                    this.setCards(serialized.length, function (i) {
                        let card;

                        const value = serialized.charCodeAt(i);

                        if (value === 128) {
                            card = null;
                        } else {
                            card = Card.create(
                                (value >> 2) & 15, // rank
                                deck.suits[value & 3], // suit
                            );

                            value & 64
                                ? card.faceDown(true)
                                : card.faceUp(true);
                        }

                        return card;
                    });

                    this.update();
                },

                imageSrc: function () {
                    const basename = this.images[this.field];

                    return basename
                        ? Solitaire.Card.base.theme + "/" + basename
                        : "trans.gif";
                },

                layout: function (layout) {
                    const hoffset = layout.hoffset * Y.Solitaire.Card.width,
                        voffset = layout.voffset * Y.Solitaire.Card.height,
                        gameOffset = Solitaire.offset,
                        self = this;

                    ["top", "left"].forEach(function (p) {
                        self[p] = normalize(layout[p]);
                    });

                    this.left += hoffset + gameOffset.left;
                    this.top += voffset + gameOffset.top;
                },

                deleteItem: function (card) {
                    _deleteItem(this.cards, card);
                },

                push: function (card, temp) {
                    const last = this.my_Last(),
                        to = this.field,
                        from = card.stack ? card.stack.field : "deck";

                    /*
                     * TODO: should zIndex setting up in setCardPosition?
                     */

                    if (last) {
                        card.zIndex = last.zIndex + 1;
                    } else if (to === "deck" || to === "foundation") {
                        card.zIndex = 200;
                    } else if (from === "deck") {
                        card.zIndex = Game.Card.zIndex;
                    }

                    if (!temp) {
                        card.stack = this;
                        this.setCardPosition(card);
                        card.truncatePosition();
                        card.ensureDOM();
                    }

                    this.cards.push(card);
                    temp || card.updatePosition({ from: from, to: to });
                },

                pushStack: function (proxy) {
                    const origin = Solitaire.activeCard.stack,
                        stack = this;

                    /* save the card's index in the stack so we can properly undo this move */
                    origin.eachCard(function (card, i) {
                        card.index = i;
                    });

                    Game.stationary(function () {
                        proxy.eachCard(function (card) {
                            card.moveTo(stack);
                            card.index = -1;
                        });
                        origin.eachCard(function (card) {
                            card.index = -1;
                        });
                    });

                    origin.updateCardsPosition();
                    origin.update();

                    Y.fire(stack.field + ":afterPush", stack);
                },

                adjustRankHeight: function () {
                    const cards = this.cards,
                        last = this.my_Last(),
                        max = Game.maxStackHeight();
                    let card,
                        sumHidden = 0,
                        sumVisible = 0,
                        sumRankHeights,
                        height = 0,
                        countHidden = 0,
                        countVisible = 0,
                        i,
                        len;
                    const Card = Solitaire.Card;

                    if (cards.length <= 1) {
                        return;
                    }

                    for (i = 0, len = cards.length - 1; i < len; i++) {
                        // if gaps in the stack are allowed, the stack's laid out horizontally
                        if (!cards[i]) {
                            return;
                        }

                        if (cards[i].isFaceDown) {
                            sumHidden += Card.hiddenRankHeight;
                            countHidden++;
                            height += Card.hiddenRankHeight;
                        } else {
                            sumVisible += Card.rankHeight;
                            countVisible++;
                            height += Card.rankHeight;
                        }
                    }

                    if (last) {
                        height += last.height;
                        sumRankHeights = max - last.height;
                    }

                    if (height <= max) {
                        this.rankHeight = 0;
                        this.hiddenRankHeight = 0;
                        return;
                    }

                    const rhHidden =
                        (sumRankHeights *
                            (sumHidden / (sumHidden + sumVisible))) /
                        countHidden;
                    const rhVisible =
                        (sumRankHeights *
                            (sumVisible / (sumHidden + sumVisible))) /
                        countVisible;

                    this.hiddenRankHeight = Math.floor(rhHidden);
                    this.rankHeight = Math.floor(rhVisible);
                },

                first: function () {
                    return this.cards[0];
                },

                my_Last: function () {
                    return _.last(this.cards);
                },

                index: function () {
                    return Game[this.field].stacks.indexOf(this);
                },

                next: function () {
                    return Game[this.field].stacks[this.index() + 1];
                },

                lastCardSetCardPosition: function (card) {
                    const last = _.last(this.cards),
                        top = last ? last.top + last.rankHeight : this.top,
                        left = this.left;

                    card.left = left;
                    card.top = top;
                },

                setCardPosition: function (card) {
                    card.top = this.top;
                    card.left = isNaN(this.left) ? null : this.left;
                },

                wrapperStyle: function () {
                    return {
                        left: Math.floor(this.left),
                        top: Math.floor(this.top),
                        width: Math.floor(Y.Solitaire.Card.width),
                        height: Math.floor(Y.Solitaire.Card.height),
                    };
                },

                updateStyle: function () {
                    const n = this.node;

                    n && n.setStyles(this.wrapperStyle());
                },

                createNode: function () {
                    const that = this;
                    const node = (that.node = Y.Node.create(
                        "<img class='stack' />",
                    )
                        .setAttribute("src", that.imageSrc())
                        .setData("target", that)
                        .plug(Y.Plugin.Drop, {
                            useShim: true,
                        }));

                    that.updateStyle();

                    Solitaire.container().append(node);
                },

                cleanup: function () {
                    const n = this.node;

                    n && n.clearData().destroy(true);

                    this.eachCard(function (c) {
                        c.destroyNode();
                    });
                },

                updateDragGroups: function () {
                    const active = Solitaire.activeCard,
                        last = this.my_Last();

                    this.eachCard(function (c) {
                        c.node.drop.removeFromGroup("open");
                    });

                    if (active.validTarget(this)) {
                        if (last) {
                            last.node.drop.addToGroup("open");
                        }
                        this.node.drop.addToGroup("open");
                    } else {
                        this.node.drop.removeFromGroup("open");
                    }
                },

                validCard: function () {
                    return true;
                },

                validProxy: function (card) {
                    return (
                        card && card.validTarget(this) && this.validCard(card)
                    );
                },

                update: function () {},
            };

            Y.Solitaire.Animation = {
                animate: true,
                dealing: false,
                duration: 0.5, // seconds
                interval: 20, // milliseconds
                queue: new Y.AsyncQueue(),

                init: function (card, to, fields) {
                    if (!this.animate) {
                        card.node.setStyles(to);
                        card.positioned = true;
                        setTimeout(function () {
                            card.runCallback();
                        }, 0);
                        return;
                    }

                    const node = card.node,
                        q = this.queue,
                        speeds = card.animSpeeds,
                        from = mapAppend(
                            mapToFloat({
                                top: node.getStyle("top"),
                                left: node.getStyle("left"),
                            }),
                            "px",
                        );
                    let duration;
                    const zIndex = to.zIndex;

                    if (from.top === to.top && from.left === to.left) {
                        return;
                    }

                    if (this.dealing) {
                        duration = speeds.slow;
                    } else if (
                        !fields ||
                        fields.from === fields.to ||
                        fields.to === "waste" ||
                        fields.to === "foundation"
                    ) {
                        duration = speeds.fast;
                    } else if (fields.from === "deck") {
                        duration = speeds.slow;
                    } else {
                        duration = speeds.mid;
                    }

                    node.setStyle("zIndex", 500 + zIndex);
                    delete to.zIndex;

                    const anim = new Y.Anim({
                        node: node,
                        from: from,
                        to: to,
                        easing: Y.Easing.easeOut,
                        duration: duration,
                    });

                    anim.on("end", function () {
                        card.positioned = true;
                        node.setStyle("zIndex", zIndex);
                        card.runCallback();
                    });

                    q.add(function () {
                        anim.run();
                    });
                    q.run();
                },

                initQueue: function () {
                    const q = this.queue;

                    q.defaults.timeout = this.interval;
                },
            };

            const Undo = {
                stack: null,

                clear: function () {
                    this.stack = [];
                },

                push: function (moves) {
                    this.stack.push(moves);
                },

                pop: function () {
                    return this.stack.pop() || [];
                },

                undo: function () {
                    const stacks = Y.Array.unique(
                        my_Flatten(Y.Array.map(this.pop(), this.act)),
                    );

                    stacks.forEach(function (stack) {
                        if (stack) {
                            stack.updateCardsPosition();
                            stack.update(true);
                        }
                    });
                },

                act: function (move) {
                    const from = move.from,
                        card = move.card,
                        to = card.stack,
                        cards = to.cards;

                    if (from) {
                        if (from === card.stack) {
                            cards[cards.indexOf(card)] = null;
                        } else {
                            _deleteItem(cards, card);
                        }

                        from.cards[move.index] = card;

                        card.stack = from;

                        Solitaire.container().append(card.node);
                    }

                    if ("faceDown" in move) {
                        move.faceDown ? card.faceUp(true) : card.faceDown(true);
                    }

                    return [to, from];
                },
            };
        },
        "0.0.1",
        {
            requires: [
                "dd",
                "dd-plugin",
                "dd-delegate",
                "anim",
                "async-queue",
                "array-extras",
            ],
        },
    );

    return {
        instance: instance,
        Game: Game,
        getGame: getGame,
        setUI: (v) => {
            enable_solitairey_ui = v;
            return;
        },
    };
});
