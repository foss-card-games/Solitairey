YUI.add(
    "agnes",
    function (Y) {
        function inSeries(first, second) {
            return (first + 1) % 13 === second % 13;
        }

        function seedRank() {
            return Agnes.foundation.stacks[0].first().rank;
        }

        const Solitaire = Y.Solitaire,
            Klondike = Solitaire.Klondike,
            Agnes = (Solitaire.Agnes = Solitaire.instance(Klondike, {
                fields: ["Foundation", "Deck", "Waste", "Tableau", "Reserve"],

                height: function () {
                    return this.Card.base.height * 5.6;
                },
                maxStackHeight: function () {
                    return this.Card.height * 4.3;
                },

                deal: function () {
                    const deck = this.deck.stacks[0],
                        foundation = this.foundation.stacks[0];

                    Klondike.deal.call(this);

                    deck.my_Last().faceUp().moveTo(foundation);

                    this.turnOver();
                },

                redeal: Solitaire.noop,

                turnOver: function () {
                    const deck = this.deck.stacks[0],
                        reserves = this.reserve.stacks,
                        waste = this.waste.stacks;
                    let count, target, i;

                    if (deck.cards.length < 7) {
                        count = 2;
                        target = waste;
                    } else {
                        count = 7;
                        target = reserves;
                    }

                    for (i = 0; i < count; i++) {
                        deck.my_Last().faceUp().moveTo(target[i]);
                    }
                },

                Waste: Solitaire.instance(Klondike.Waste, {
                    stackConfig: {
                        total: 2,
                        layout: {
                            hspacing: 1.5,
                            top: 0,
                            left: 0,
                        },
                    },

                    Stack: Solitaire.instance(Solitaire.Stack, {
                        setCardPosition: function (card) {
                            const last = this.my_Last(),
                                top = this.top,
                                left = last
                                    ? last.left + Solitaire.Card.width * 1.5
                                    : this.left;

                            card.top = top;
                            card.left = left;
                        },
                    }),
                }),

                Reserve: {
                    field: "reserve",
                    stackConfig: {
                        total: 7,
                        layout: {
                            hspacing: 1.25,
                            left: 0,
                            top: function () {
                                return Solitaire.Card.height * 4.4;
                            },
                        },
                    },

                    Stack: Solitaire.instance(Klondike.Stack, {
                        images: {},

                        setCardPosition: function (card) {
                            return this.lastCardSetCardPosition(card);
                        },
                    }),
                },

                Card: Solitaire.instance(Klondike.Card, {
                    playable: function () {
                        if (this.stack.field === "reserve") {
                            return this.isFree();
                        } else {
                            return Klondike.Card.playable.call(this);
                        }
                    },

                    validTarget: function (stack) {
                        const target = stack.my_Last();

                        switch (stack.field) {
                            case "tableau":
                                if (!target) {
                                    return inSeries(this.rank, seedRank());
                                } else {
                                    return (
                                        !target.isFaceDown &&
                                        target.color !== this.color &&
                                        inSeries(this.rank, target.rank)
                                    );
                                }
                            case "foundation":
                                return this.validFoundationTarget(target);
                            default:
                                return false;
                        }
                    },

                    validFoundationTarget: function (target) {
                        if (!target) {
                            return this.rank === seedRank();
                        } else {
                            return (
                                this.suit === target.suit &&
                                this.rank % 13 === (target.rank + 1) % 13
                            );
                        }
                    },
                }),
            }));
    },
    "0.0.1",
    { requires: ["klondike"] },
);
