YUI.add(
    "scorpion",
    function (Y) {
        const Solitaire = Y.Solitaire,
            Scorpion = (Solitaire.Scorpion = Solitaire.instance(Solitaire, {
                fields: ["Foundation", "Deck", "Tableau"],

                createEvents: function () {
                    Solitaire.AutoStackClear.register();
                    Solitaire.createEvents.call(this);
                },

                deal: function () {
                    const deck = this.deck,
                        stacks = this.tableau.stacks;

                    for (let row = 0; row < 7; row++) {
                        for (let stack = 0; stack < 7; stack++) {
                            const card = deck.pop();

                            if (!(row < 3 && stack < 4)) {
                                card.faceUp();
                            }

                            stacks[stack].push(card);
                        }
                    }

                    deck.createStack();
                },

                turnOver: function () {
                    const deck = this.deck.stacks[0],
                        stacks = this.tableau.stacks;

                    for (let i = 0; i < 3; i++) {
                        deck.my_Last().faceUp().moveTo(stacks[i]);
                    }
                },

                height: function () {
                    return this.Card.base.height * 5.6;
                },

                Stack: Solitaire.instance(Solitaire.Stack),

                Deck: Solitaire.instance(Solitaire.Deck, {
                    stackConfig: {
                        total: 1,
                        layout: {
                            top: 0,
                            left: function () {
                                return Solitaire.Card.width * 9;
                            },
                        },
                    },
                    field: "deck",

                    createStack: function () {
                        for (let i = this.cards.length - 1; i >= 0; i--) {
                            this.stacks[0].push(this.cards[i]);
                        }
                    },
                }),

                Foundation: {
                    stackConfig: {
                        total: 4,
                        layout: {
                            top: function () {
                                return Solitaire.Card.height * 1.1;
                            },
                            left: function () {
                                return Solitaire.Card.width * 9;
                            },
                            vspacing: 1.1,
                        },
                    },
                    field: "foundation",
                },

                Tableau: {
                    stackConfig: {
                        total: 7,
                        layout: {
                            hspacing: 1.25,
                            top: 0,
                            left: 0,
                        },
                    },
                    field: "tableau",
                },

                Card: Solitaire.instance(Solitaire.Card, {
                    playable: function () {
                        const field = this.stack.field;

                        return (
                            field === "deck" ||
                            (field === "tableau" && !this.isFaceDown)
                        );
                    },

                    validTarget: function (stack) {
                        const target = stack.my_Last();

                        if (stack.field !== "tableau") {
                            return false;
                        }

                        if (!target) {
                            return this.rank === 13;
                        } else {
                            return (
                                !target.isFaceDown &&
                                target.suit === this.suit &&
                                target.rank === this.rank + 1
                            );
                        }
                    },
                }),
            }));

        Scorpion.fields.forEach(function (field) {
            Scorpion[field].Stack = Solitaire.instance(Scorpion.Stack);
        });

        Y.mix(
            Scorpion.Stack,
            {
                validTarget: function (stack) {
                    return (
                        stack.field === "tableau" &&
                        this.first().validTarget(stack)
                    );
                },

                validProxy: function (card) {
                    return true;
                },

                validTarget: function (stack) {
                    const cards = this.cards;

                    switch (stack.field) {
                        case "tableau":
                            return this.first().validTarget(stack);
                            break;
                        case "foundation":
                            const rank = this.last.rank;
                            if (cards.length !== 13) {
                                return false;
                            }

                            for (let i = 0; i < 13; i++) {
                                if (cards[i].rank !== rank) {
                                    return false;
                                }
                            }

                            return true;
                            break;
                    }
                },
            },
            true,
        );

        Y.mix(
            Scorpion.Tableau.Stack,
            {
                setCardPosition: function (card) {
                    return this.lastCardSetCardPosition(card);
                },
            },
            true,
        );
    },
    "0.0.1",
    { requires: ["auto-stack-clear"] },
);
