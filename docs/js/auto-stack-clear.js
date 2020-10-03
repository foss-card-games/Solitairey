define(["./solitaire"], function (solitaire) {
    /*
     * Stack extension class to automatically move complete stacks/runs to the foundation
     */
    YUI.add(
        "auto-stack-clear",
        function (Y) {
            const Solitaire = Y.Solitaire;

            Y.namespace("Solitaire.AutoStackClear");

            Solitaire.AutoStackClear.register = function () {
                Y.on("solitaire|tableau:afterPush", function (stack) {
                    isComplete(stack, clearComplete);
                });
            };

            function isComplete(stack, callback) {
                const cards = stack.cards;
                let rank, suit, card, i;

                if (!cards.length) {
                    return false;
                }

                for (
                    i = cards.length - 1, rank = 1, suit = cards[i].suit;
                    i >= 0 && rank < 14;
                    i--, rank++
                ) {
                    card = cards[i];

                    if (
                        card.isFaceDown ||
                        card.rank !== rank ||
                        card.suit !== suit
                    ) {
                        return false;
                    }
                }

                const complete = rank === 14;
                complete &&
                    typeof callback === "function" &&
                    callback(stack, i + 1);
                return complete;
            }

            function clearComplete(stack, startIndex) {
                const cards = stack.cards;
                let count = cards.length - startIndex;

                // find the first empty foundation
                const foundation = Y.Array.find(
                    Solitaire.game.foundation.stacks,
                    function (stack) {
                        return !stack.cards.length;
                    },
                );

                Solitaire.stationary(function () {
                    while (count) {
                        _.last(cards).moveTo(foundation);
                        count--;
                    }
                });

                stack.updateCardsPosition();
            }
        },
        "0.0.1",
        { requires: ["solitaire"] },
    );

    return {
        auto_stack: true,
    };
});
