define(["./solitaire"], function (solitaire) {
    // automatically turn over the first open faceup card in a stack
    YUI.add(
        "auto-turnover",
        function (Y) {
            Y.on("tableau:afterPop", function (stack) {
                stack.cards.forEach(function (card) {
                    if (card && card.isFaceDown && card.isFree()) {
                        card.faceUp();
                    }
                });
            });
        },
        "0.0.1",
        { requires: ["solitaire"] },
    );
    return {};
});
