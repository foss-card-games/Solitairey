YUI.add(
    "spider2s",
    function(Y) {
        const Spider = (Y.Solitaire.Spider2S = Y.Solitaire.instance(
            Y.Solitaire.Spider,
        ));

        Spider.Deck = Y.Solitaire.instance(Y.Solitaire.Spider.Deck, {
            suits: ["s", "h"],
            count: 4,
        });
    },
    "0.0.1",
    { requires: ["spider"] },
);
