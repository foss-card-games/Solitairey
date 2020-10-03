YUI.add(
    "pyramid",
    function (Y) {
        const Solitaire = Y.Solitaire,
            Pyramid = (Y.Solitaire.Pyramid = Solitaire.instance(Solitaire, {
                fields: ["Foundation", "Deck", "Waste", "Tableau"],

                deal: function () {
                    const deck = this.deck,
                        stacks = this.tableau.stacks;

                    for (let stack = 0; stack < 7; stack++) {
                        for (let i = 0; i <= stack; i++) {
                            const card = deck.pop().faceUp();
                            stacks[stack].push(card);
                        }
                    }

                    deck.createStack();
                    deck.my_Last().faceUp();
                },

                turnOver: function () {
                    const deck = this.deck.stacks[0],
                        waste = this.waste.stacks[0];

                    if (deck.cards.length === 1) {
                        return;
                    }
                    deck.my_Last().moveTo(waste);
                },

                height: function () {
                    return this.Card.base.height * 4.85;
                },

                Stack: Solitaire.instance(Solitaire.Stack, {
                    images: {},

                    updateDragGroups: function () {
                        const active = Solitaire.activeCard;

                        Y.Array.each(this.cards, function (c) {
                            if (!c) {
                                return;
                            }

                            if (active.validTarget(c)) {
                                c.node.drop.addToGroup("open");
                            } else {
                                c.node.drop.removeFromGroup("open");
                            }
                        });
                    },
                }),

                Events: Solitaire.instance(Solitaire.Events, {
                    dragCheck: function (e) {
                        if (!Solitaire.game.autoPlay.call(this)) {
                            Solitaire.Events.dragCheck.call(this);
                        }
                    },

                    drop: function (e) {
                        const active = Solitaire.activeCard,
                            foundation = Solitaire.game.foundation.stacks[0],
                            target = e.drop.get("node").getData("target");

                        if (!active) {
                            return;
                        }

                        Solitaire.stationary(function () {
                            target.moveTo(foundation);
                            active.moveTo(foundation);
                        });

                        Solitaire.endTurn();
                    },
                }),

                Foundation: {
                    stackConfig: {
                        total: 1,
                        layout: {
                            hspacing: 0,
                            top: 0,
                            left: function () {
                                return Solitaire.Card.width * 8;
                            },
                        },
                    },
                    field: "foundation",
                },

                Deck: Solitaire.instance(Solitaire.Deck, {
                    stackConfig: {
                        total: 1,
                        layout: {
                            hspacing: 0,
                            top: 0,
                            left: 0,
                        },
                    },
                    field: "deck",

                    createStack: function () {
                        for (let i = 0, len = this.cards.length; i < len; i++) {
                            this.stacks[0].push(this.cards[i]);
                        }
                    },
                }),

                Waste: {
                    stackConfig: {
                        total: 1,
                        layout: {
                            hspacing: 0,
                            top: 0,
                            left: function () {
                                return Solitaire.Card.width * 1.5;
                            },
                        },
                    },
                    field: "waste",
                },

                Tableau: {
                    stackConfig: {
                        total: 7,
                        layout: {
                            vspacing: 0.6,
                            hspacing: -0.625,
                            cardGap: 1.25,
                            top: 0,
                            left: function () {
                                return Solitaire.Card.width * 5;
                            },
                        },
                    },
                    field: "tableau",
                },

                Card: Solitaire.instance(Solitaire.Card, {
                    validTarget: function (card) {
                        if (card.field === "foundation") {
                            // "card" is actually a stack :/
                            return this.isFree() && this.rank === 13;
                        }

                        if (card.isFree()) {
                            return this.rank + card.rank === 13;
                        }

                        return false;
                    },

                    createProxyNode: function () {
                        return this.rank === 13
                            ? ""
                            : Solitaire.Card.createProxyNode.call(this);
                    },

                    createProxyStack: function () {
                        let stack = null;

                        if (this.isFree()) {
                            stack = Solitaire.instance(this.stack);
                            stack.cards = this.proxyCards();
                        }

                        this.proxyStack = stack;

                        return this.proxyStack;
                    },

                    proxyCards: function () {
                        return [this];
                    },

                    isFree: function () {
                        const stack = this.stack,
                            stackIndex = stack.index(),
                            index = stack.cards.indexOf(this),
                            game = Solitaire.game,
                            next = stack.next();

                        if (stack.field === "deck" || stack.field === "waste") {
                            return !this.isFaceDown;
                        } else {
                            return !(
                                this.stack.field === "foundation" ||
                                (next &&
                                    (next.cards[index] ||
                                        next.cards[index + 1]))
                            );
                        }
                    },

                    turnOver: function () {
                        this.stack.field === "deck" &&
                            !this.isFaceDown &&
                            Solitaire.game.turnOver();
                    },
                }),
            }));

        Y.Array.each(Pyramid.fields, function (field) {
            Pyramid[field].Stack = Solitaire.instance(Pyramid.Stack);
        });

        Y.mix(
            Pyramid.Tableau.Stack,
            {
                deleteItem: function (card) {
                    const cards = this.cards,
                        i = cards.indexOf(card);

                    if (i !== -1) {
                        cards[i] = null;
                    }
                },

                setCardPosition: function (card) {
                    const layout = Pyramid.Tableau.stackConfig.layout,
                        last = _.last(this.cards),
                        top = this.top,
                        left = last
                            ? last.left + card.width * layout.cardGap
                            : this.left;

                    card.left = left;
                    card.top = top;
                    card.zIndex = this.index() * 10;
                },
            },
            true,
        );

        Y.mix(
            Pyramid.Deck.Stack,
            {
                deleteItem: function (card) {
                    Pyramid.Stack.deleteItem.call(this, card);
                    this.update();
                },

                update: function (undo) {
                    const last = this.my_Last();

                    last && last.faceUp(undo);
                },

                updateDragGroups: function () {
                    const active = Solitaire.activeCard,
                        card = this.my_Last();

                    if (!card) {
                        return;
                    }

                    if (active.validTarget(card)) {
                        card.node.drop.addToGroup("open");
                    } else {
                        card.node.drop.removeFromGroup("open");
                    }
                },
            },
            true,
        );

        Pyramid.Waste.Stack.updateDragGroups =
            Pyramid.Deck.Stack.updateDragGroups;
    },
    "0.0.1",
    { requires: ["solitaire"] },
);
