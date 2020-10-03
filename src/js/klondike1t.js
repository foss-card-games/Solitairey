YUI.add(
    "klondike1t",
    function (Y) {
        const Solitaire = Y.Solitaire,
            Klondike = Solitaire.Klondike,
            Klondike1T = (Solitaire.Klondike1T = Solitaire.instance(Klondike, {
                redeal: Solitaire.noop,

                turnOver: function () {
                    const deck = this.deck.stacks[0],
                        waste = this.waste.stacks[0],
                        card = deck.my_Last();

                    card && card.faceUp().moveTo(waste);
                },

                Waste: Solitaire.instance(Klondike.Waste, {
                    Stack: Solitaire.instance(Solitaire.Stack),
                }),

                Deck: Solitaire.instance(Klondike.Deck, {
                    Stack: Solitaire.instance(Klondike.Deck.Stack, {
                        createNode: function () {
                            Klondike.Deck.Stack.createNode.call(this);
                            this.node.removeClass("playable");
                        },
                    }),
                }),
            }));
    },
    "0.0.1",
    { requires: ["klondike"] },
);
