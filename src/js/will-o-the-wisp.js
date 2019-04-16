YUI.add(
    "will-o-the-wisp",
    function(Y) {
        const Solitaire = Y.Solitaire,
            WillOTheWisp = (Y.Solitaire.WillOTheWisp = instance(
                Solitaire.Spiderette,
                {
                    deal: function() {
                        const deck = this.deck;

                        for (let row = 0; row < 3; row++) {
                            this.eachStack(function(stack) {
                                const card = deck.pop();
                                if (row === 2) {
                                    card.faceUp();
                                }

                                stack.push(card);
                            }, "tableau");
                        }

                        deck.createStack();
                    },
                },
            ));
    },
    "0.0.1",
    { requires: ["spiderette"] },
);
