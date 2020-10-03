YUI.add(
    "golf",
    function (Y) {
        const Solitaire = Y.Solitaire,
            Golf = (Y.Solitaire.Golf = Solitaire.instance(
                Solitaire,
                {
                    fields: ["Deck", "Foundation", "Tableau"],

                    deal: function () {
                        let card, stack, row;
                        const stacks = this.tableau.stacks,
                            deck = this.deck,
                            foundation = this.foundation.stacks[0];

                        for (row = 0; row < 5; row++) {
                            for (stack = 0; stack < 7; stack++) {
                                card = deck.pop().faceUp();
                                stacks[stack].push(card);
                            }
                        }

                        card = deck.pop().faceUp();
                        foundation.push(card);

                        deck.createStack();
                    },

                    turnOver: function () {
                        const deck = this.deck.stacks[0],
                            foundation = this.foundation.stacks[0],
                            last = deck.my_Last();

                        last && last.faceUp().moveTo(foundation);
                    },

                    isWon: function () {
                        let won = true;

                        this.eachStack(function (stack) {
                            stack.eachCard(function (card) {
                                if (card) {
                                    won = false;
                                }

                                return won;
                            });
                        }, "tableau");

                        return won;
                    },

                    height: function () {
                        return this.Card.base.height * 4;
                    },

                    Deck: Solitaire.instance(Solitaire.Deck, {
                        field: "deck",
                        stackConfig: {
                            total: 1,
                            layout: {
                                hspacing: 0,
                                top: function () {
                                    return Solitaire.Card.height * 3;
                                },
                                left: 0,
                            },
                        },

                        createStack: function () {
                            let i, len;

                            for (i = 0, len = this.cards.length; i < len; i++) {
                                this.stacks[0].push(this.cards[i]);
                            }
                        },
                    }),

                    Tableau: {
                        field: "tableau",
                        stackConfig: {
                            total: 7,
                            layout: {
                                hspacing: 1.25,
                                top: 0,
                                left: 0,
                            },
                        },
                    },

                    Foundation: {
                        field: "foundation",
                        stackConfig: {
                            total: 1,
                            layout: {
                                hspacing: 0,
                                top: function () {
                                    return Solitaire.Card.height * 3;
                                },
                                left: function () {
                                    return Solitaire.Card.width * 3.75;
                                },
                            },
                        },
                    },

                    Events: Solitaire.instance(Solitaire.Events, {
                        dragCheck: function (e) {
                            this.getCard().autoPlay();

                            /* workaround because YUI retains stale drag information if we halt the event :\ */
                            this._afterDragEnd();
                            e.halt();
                        },
                    }),

                    Card: Solitaire.instance(Solitaire.Card, {
                        /*
                         * return true if the target is 1 rank away from the this card
                         */
                        validTarget: function (stack) {
                            if (stack.field !== "foundation") {
                                return false;
                            }

                            const target = stack.my_Last(),
                                diff = Math.abs(this.rank - target.rank);

                            return diff === 1;
                        },

                        isFree: function () {
                            return (
                                !this.isFaceDown &&
                                this === this.stack.my_Last()
                            );
                        },
                    }),

                    Stack: Solitaire.instance(Solitaire.Stack, {
                        images: {},
                    }),
                },
                true,
            ));

        Golf.fields.forEach(function (field) {
            Golf[field].Stack = Solitaire.instance(Golf.Stack);
        });

        Y.mix(
            Golf.Tableau.Stack,
            {
                setCardPosition: function (card) {
                    return this.lastCardSetCardPosition(card);
                },
            },
            true,
        );

        Y.mix(
            Golf.Deck.Stack,
            {
                setCardPosition: function (card) {
                    let left, zIndex;

                    const last = this.my_Last();
                    const top = this.top;
                    if (last) {
                        left = last.left + card.width * 0.1;
                        zIndex = last.zIndex + 1;
                    } else {
                        left = this.left;
                        zIndex = 0;
                    }

                    card.top = top;
                    card.left = left;
                    card.zIndex = zIndex;
                },
            },
            true,
        );
    },
    "0.0.1",
    { requires: ["solitaire"] },
);
