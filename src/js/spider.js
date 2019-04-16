YUI.add(
    "spider",
    function(Y) {
        const Solitaire = Y.Solitaire,
            Spider = (Solitaire.Spider = instance(Solitaire, {
                fields: ["Foundation", "Deck", "Tableau"],

                createEvents: function() {
                    Solitaire.AutoStackClear.register();
                    Solitaire.createEvents.call(this);
                },

                deal: function() {
                    const deck = this.deck,
                        stacks = this.tableau.stacks;

                    for (let row = 0; row < 5; row++) {
                        for (let stack = 0; stack < 10; stack++) {
                            if (stack < 4 || row < 4) {
                                stacks[stack].push(deck.pop());
                            }
                        }
                    }

                    for (let stack = 0; stack < 10; stack++) {
                        stacks[stack].push(deck.pop().faceUp());
                    }

                    deck.createStack();
                },

                redeal: function() {},

                turnOver: function() {
                    const deck = this.deck.stacks[0];
                    const that = this;

                    if (hasFreeTableaus()) {
                        return;
                    }

                    this.eachStack(function(stack) {
                        const card = deck.my_Last();

                        if (card) {
                            card.faceUp()
                                .moveTo(stack)
                                .after(function() {
                                    that.stack.updateCardsPosition();
                                });
                        }
                    }, "tableau");
                },

                Stack: instance(Solitaire.Stack),

                Foundation: {
                    stackConfig: {
                        total: 8,
                        layout: {
                            hspacing: 1.25,
                            top: 0,
                            left: function() {
                                return Solitaire.Card.width * 2.5;
                            },
                        },
                    },
                    field: "foundation",
                    draggable: false,
                },

                Deck: instance(Solitaire.Deck, {
                    count: 2,

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

                Tableau: {
                    stackConfig: {
                        total: 10,
                        layout: {
                            hspacing: 1.25,
                            top: function() {
                                return Solitaire.Card.height * 1.5;
                            },
                            left: 0,
                        },
                    },
                    field: "tableau",
                },

                Card: instance(Solitaire.Card, {
                    playable: function() {
                        const previous = this.stack[this.index - 1];

                        switch (this.stack.field) {
                            case "tableau":
                                return this.createProxyStack();
                            case "deck":
                                return !hasFreeTableaus();
                            case "foundation":
                                return false;
                        }
                    },

                    validTarget: function(stack) {
                        if (stack.field !== "tableau") {
                            return false;
                        }

                        const target = stack.my_Last();

                        return (
                            !target ||
                            (!target.isFaceDown &&
                                target.rank === this.rank + 1)
                        );
                    },
                }),
            }));

        function hasFreeTableaus() {
            return Y.Array.some(Game.tableau.stacks, function(stack) {
                return !stack.cards.length;
            });
        }

        Y.Array.each(Spider.fields, function(field) {
            Spider[field].Stack = instance(Spider.Stack);
        });

        Y.mix(
            Spider.Stack,
            {
                validCard: function(card) {
                    return card.suit === _.last(this.cards).suit;
                },

                validTarget: function(stack) {
                    switch (stack.field) {
                        case "tableau":
                            return this.first().validTarget(stack);
                            break;
                        case "foundation":
                            return this.cards.length === 13;
                            break;
                    }
                },
            },
            true,
        );

        Y.mix(
            Spider.Tableau.Stack,
            {
                setCardPosition: function(card) {
                    return this.lastCardSetCardPosition(card);
                },
            },
            true,
        );
    },
    "0.0.1",
    { requires: ["auto-stack-clear"] },
);
