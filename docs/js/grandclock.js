YUI.add(
    "grandfathers-clock",
    function (Y) {
        function wrap(array, index) {
            const len = array.length;

            index %= len;
            if (index < 0) {
                index += len;
            }

            return array[index];
        }

        function inRange(low, high, value) {
            if (low <= high) {
                return low <= value && value <= high;
            } else {
                return low <= value || value <= high;
            }
        }

        Y.namespace("Solitaire.GClock");

        const Solitaire = Y.Solitaire,
            GClock = (Y.Solitaire.GClock = Solitaire.instance(Solitaire, {
                fields: ["Foundation", "Tableau"],

                deal: function () {
                    let card,
                        found,
                        stack = 0,
                        i = 51,
                        rank;
                    const deck = this.deck,
                        cards = deck.cards,
                        clock = [],
                        suits = ["d", "c", "h", "s"],
                        foundations = this.foundation.stacks,
                        stacks = this.tableau.stacks;

                    while (i >= 0) {
                        card = cards[i];
                        found = false;

                        for (rank = 2; rank <= 13; rank++) {
                            if (
                                card.rank === rank &&
                                card.suit === wrap(suits, rank)
                            ) {
                                found = true;
                                cards.splice(i, 1);
                                clock[rank - 2] = card.faceUp();
                                break;
                            }
                        }

                        if (!found) {
                            stacks[stack].push(card.faceUp());
                            stack = (stack + 1) % 8;
                        }
                        i--;
                    }

                    for (i = 0; i < 12; i++) {
                        foundations[(i + 2) % 12].push(clock[i]);
                    }
                },

                height: function () {
                    return this.Card.base.height * 6.7;
                },

                Stack: Solitaire.instance(Solitaire.Stack),

                Foundation: {
                    stackConfig: {
                        total: 12,
                        layout: {
                            hspacing: 1.25,
                            top: function () {
                                return Solitaire.Card.height * 3;
                            },
                            left: function () {
                                return Solitaire.Card.width * 3.25;
                            },
                        },
                    },
                    field: "foundation",
                    draggable: false,
                },

                Tableau: {
                    stackConfig: {
                        total: 8,
                        layout: {
                            hspacing: 1.25,
                            top: 0,
                            left: function () {
                                return Solitaire.Card.width * 7.25;
                            },
                        },
                    },
                    field: "tableau",
                    draggable: true,
                },

                Card: Solitaire.instance(Solitaire.Card, {
                    createProxyStack: function () {
                        switch (this.stack.field) {
                            case "foundation":
                                this.proxyStack = null;
                                break;
                            case "tableau":
                                return Solitaire.Card.createProxyStack.call(
                                    this,
                                );
                        }

                        return this.proxyStack;
                    },

                    validTarget: function (stack) {
                        const target = stack.my_Last();
                        let rank, hour;

                        switch (stack.field) {
                            case "tableau":
                                if (!target) {
                                    return true;
                                } else {
                                    return target.rank === this.rank + 1;
                                }
                                break;
                            case "foundation":
                                hour = (stack.index() + 3) % 12;
                                rank = target.rank;

                                return (
                                    target.suit === this.suit &&
                                    (target.rank + 1) % 13 === this.rank % 13 &&
                                    inRange(stack.first().rank, hour, this.rank)
                                );
                                break;
                            default:
                                return false;
                                break;
                        }
                    },
                }),
            }));

        GClock.fields.forEach(function (field) {
            GClock[field].Stack = Solitaire.instance(GClock.Stack);
        });

        Y.mix(
            GClock.Stack,
            {
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
            GClock.Tableau.Stack,
            {
                setCardPosition: function (card) {
                    return this.lastCardSetCardPosition(card);
                },
            },
            true,
        );

        function normalize(valOrFunction) {
            const val =
                typeof valOrFunction === "function"
                    ? valOrFunction()
                    : valOrFunction;

            return isNaN(val) ? undefined : val;
        }

        Y.mix(
            GClock.Foundation.Stack,
            {
                index: function () {
                    return GClock.foundation.stacks.indexOf(this);
                },

                layout: function (layout, i) {
                    const top =
                            Math.sin((Math.PI * i) / 6) *
                            Solitaire.Card.height *
                            2.25,
                        left =
                            Math.cos((Math.PI * i) / 6) *
                            Solitaire.Card.width *
                            3;

                    this.top = top + normalize(layout.top);
                    this.left = left + normalize(layout.left);
                },
            },
            true,
        );
    },
    "0.0.1",
    { requires: ["solitaire"] },
);
