YUI.add(
    "klondike",
    function (Y) {
        const Solitaire = Y.Solitaire,
            Klondike = (Y.Solitaire.Klondike = Solitaire.instance(Solitaire, {
                fields: ["Foundation", "Deck", "Waste", "Tableau"],

                deal: function () {
                    let card,
                        piles = 6,
                        stack = 0;
                    const deck = this.deck,
                        stacks = this.tableau.stacks;

                    while (piles >= 0) {
                        card = deck.pop().faceUp();
                        stacks[6 - piles].push(card);

                        for (stack = 7 - piles; stack < 7; stack++) {
                            card = deck.pop();
                            stacks[stack].push(card);
                        }
                        piles--;
                    }

                    deck.createStack();
                },

                turnOver: function () {
                    const deck = this.deck.stacks[0],
                        waste = this.waste.stacks[0],
                        updatePosition = Klondike.Card.updatePosition;

                    Klondike.Card.updatePosition = Solitaire.noop;

                    for (
                        let i = deck.cards.length, stop = i - 3;
                        i > stop && i;
                        --i
                    ) {
                        deck.my_Last().faceUp().moveTo(waste);
                    }

                    Klondike.Card.updatePosition = updatePosition;

                    waste.eachCard(function (c) {
                        c.updatePosition();
                    });
                },

                redeal: function () {
                    const deck = this.deck.stacks[0],
                        waste = this.waste.stacks[0];

                    while (waste.cards.length) {
                        waste.my_Last().faceDown().moveTo(deck);
                    }
                },

                Stack: Solitaire.instance(Solitaire.Stack),

                Foundation: {
                    stackConfig: {
                        total: 4,
                        layout: {
                            hspacing: 1.25,
                            top: 0,
                            left: function () {
                                return Solitaire.Card.width * 3.75;
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
                            hspacing: 1.25,
                            top: function () {
                                return Solitaire.Card.height * 1.5;
                            },
                            left: 0,
                        },
                    },
                    field: "tableau",
                },

                Card: Solitaire.instance(Solitaire.Card, {
                    playable: function () {
                        switch (this.stack.field) {
                            case "tableau":
                                return !this.isFaceDown;
                            case "foundation":
                                return false;
                            case "waste":
                                return this.isFree();
                            case "deck":
                                return true;
                        }
                    },

                    validFoundationTarget: function (target) {
                        if (!target) {
                            return this.rank === 1;
                        } else {
                            return (
                                target.suit === this.suit &&
                                target.rank === this.rank - 1
                            );
                        }
                    },

                    validTarget: function (stack) {
                        const target = stack.my_Last();

                        switch (stack.field) {
                            case "tableau":
                                if (!target) {
                                    return this.rank === 13;
                                } else {
                                    return (
                                        !target.isFaceDown &&
                                        target.color !== this.color &&
                                        target.rank === this.rank + 1
                                    );
                                }
                            case "foundation":
                                return this.validFoundationTarget(target);
                            default:
                                return false;
                        }
                    },
                }),
            }));

        Klondike.fields.forEach(function (field) {
            Klondike[field].Stack = Solitaire.instance(Klondike.Stack);
        });

        Y.mix(
            Klondike.Stack,
            {
                validTarget: function (stack) {
                    return (
                        stack.field === "tableau" &&
                        this.first().validTarget(stack)
                    );
                },
            },
            true,
        );

        Y.mix(
            Klondike.Tableau.Stack,
            {
                setCardPosition: function (card) {
                    return this.lastCardSetCardPosition(card);
                },
            },
            true,
        );

        Y.mix(
            Klondike.Waste.Stack,
            {
                // always display only the last three cards
                setCardPosition: function (card) {
                    const cards = this.cards,
                        last = _.last(cards),
                        stack = this;

                    cards.slice(-2).forEach(function (card, i) {
                        card.left = stack.left;
                        card.top = stack.top;
                    });

                    if (!cards.length) {
                        card.left = stack.left;
                    }

                    if (cards.length === 1) {
                        card.left = stack.left + 0.2 * card.width;
                    } else if (cards.length > 1) {
                        last.left = stack.left + 0.2 * card.width;
                        last.top = stack.top;
                        card.left = stack.left + 0.4 * card.width;
                    }

                    card.top = stack.top;
                },
            },
            true,
        );

        Y.mix(
            Klondike.Deck.Stack,
            {
                createNode: function () {
                    Solitaire.Stack.createNode.call(this);
                    this.node.on("click", Solitaire.Events.clickEmptyDeck);
                    this.node.addClass("playable");
                },
            },
            true,
        );
    },
    "0.0.1",
    { requires: ["solitaire"] },
);
