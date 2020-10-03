YUI.add(
    "flower-garden",
    function (Y) {
        const Solitaire = Y.Solitaire,
            FlowerGarden = (Y.Solitaire.FlowerGarden = Solitaire.instance(
                Solitaire,
                {
                    fields: ["Foundation", "Reserve", "Tableau"],

                    deal: function () {
                        let card,
                            stack = 0,
                            i;
                        const stacks = this.tableau.stacks;
                        (deck = this.deck), (reserve = this.reserve.stacks[0]);

                        for (i = 0; i < 36; i++) {
                            card = deck.pop();
                            stacks[stack].push(card.faceUp());
                            stack++;
                            if (stack === 6) {
                                stack = 0;
                            }
                        }

                        while ((card = deck.pop())) {
                            card.faceUp();
                            reserve.push(card);
                        }
                    },

                    height: function () {
                        return this.Card.base.height * 5.5;
                    },
                    maxStackHeight: function () {
                        return this.Card.height * 4.4;
                    },

                    Stack: Solitaire.instance(Solitaire.Stack),

                    Foundation: {
                        stackConfig: {
                            total: 4,
                            layout: {
                                hspacing: 1.25,
                                top: 0,
                                left: function () {
                                    return Solitaire.Card.width * 4.25;
                                },
                            },
                        },
                        field: "foundation",
                        draggable: false,
                    },

                    Reserve: {
                        stackConfig: {
                            total: 1,
                            layout: {
                                hspacing: 1.25,
                                top: function () {
                                    return Solitaire.Card.height * 4.5;
                                },
                                left: function () {
                                    return Solitaire.Card.width * 3;
                                },
                            },
                        },
                        field: "reserve",
                        draggable: true,
                    },

                    Tableau: {
                        stackConfig: {
                            total: 6,
                            layout: {
                                hspacing: 1.25,
                                top: function () {
                                    return Solitaire.Card.height * 1.25;
                                },
                                left: function () {
                                    return Solitaire.Card.width * 3;
                                },
                            },
                        },
                        field: "tableau",
                        draggable: true,
                    },

                    Card: Solitaire.instance(Solitaire.Card, {
                        rankHeight: 24,

                        createProxyStack: function () {
                            let stack;

                            switch (this.stack.field) {
                                case "foundation":
                                    this.proxyStack = null;
                                    break;
                                case "tableau":
                                    return Solitaire.Card.createProxyStack.call(
                                        this,
                                    );
                                case "reserve":
                                    stack = Solitaire.instance(this.stack);
                                    stack.cards = [this];
                                    this.proxyStack = stack;
                                    break;
                            }

                            return this.proxyStack;
                        },

                        moveTo: function (stack) {
                            const cards = this.stack.cards,
                                index = cards.indexOf(this);
                            let i, len;

                            /*
                             * TODO: fix this hack
                             * if moveTo.call is called after the other card's positions have been saved, the card move is animated twice on undo
                             * the insertion of null is to preserve indexes and prevent this card from getting deleted on undo
                             */

                            Solitaire.Card.moveTo.call(this, stack);

                            cards.splice(index, 0, null);
                            for (
                                i = index + 1, len = cards.length;
                                i < len;
                                i++
                            ) {
                                cards[i].pushPosition();
                            }
                            cards.splice(index, 1);
                        },

                        validTarget: function (stack) {
                            const target = stack.my_Last();

                            switch (stack.field) {
                                case "tableau":
                                    if (!target) {
                                        return true;
                                    } else {
                                        return target.rank === this.rank + 1;
                                    }
                                    break;
                                case "foundation":
                                    if (!target) {
                                        return this.rank === 1;
                                    } else {
                                        return (
                                            target.suit === this.suit &&
                                            target.rank === this.rank - 1
                                        );
                                    }
                                    break;
                                default:
                                    return false;
                                    break;
                            }
                        },

                        isFree: function () {
                            if (this.stack.field === "reserve") {
                                return true;
                            } else {
                                return Solitaire.Card.isFree.call(this);
                            }
                        },
                    }),
                },
                true,
            ));

        Y.Array.each(
            FlowerGarden.fields,
            function (field) {
                FlowerGarden[field].Stack = Solitaire.instance(
                    FlowerGarden.Stack,
                );
            },
            true,
        );

        Y.mix(
            FlowerGarden.Stack,
            {
                images: { foundation: "freeslot.png", tableau: "freeslot.png" },

                validTarget: function (stack) {
                    return (
                        stack.field === "tableau" &&
                        this.first().validTarget(stack)
                    );
                },

                validCard: function () {
                    return false;
                },
            },
            true,
        );

        Y.mix(
            FlowerGarden.Tableau.Stack,
            {
                setCardPosition: function (card) {
                    return this.lastCardSetCardPosition(card);
                },
            },
            true,
        );

        Y.mix(
            FlowerGarden.Reserve.Stack,
            {
                setCardPosition: function (card) {
                    const last = _.last(this.cards),
                        left = last
                            ? last.left + Solitaire.Card.width * 0.4
                            : this.left,
                        top = this.top;

                    card.left = left;
                    card.top = top;
                },

                update: function (undo) {
                    if (undo) {
                        return;
                    }

                    const stack = this;

                    Y.Array.each(this.cards, function (card, i) {
                        const left = stack.left + i * card.width * 0.4;

                        if (left !== card.left) {
                            card.left = left;
                            card.updatePosition();
                        }
                    });
                },
            },
            true,
        );
    },
    "0.0.1",
    { requires: ["solitaire"] },
);
