YUI.add(
    "spider1s",
    function (Y) {
        const Solitaire = Y.Solitaire,
            Spider = (Y.Solitaire.Spider1S = Solitaire.instance(
                Y.Solitaire.Spider,
            ));

        Spider.Deck = Solitaire.instance(Y.Solitaire.Spider.Deck, {
            suits: ["s"],
            count: 8,
        });
    },
    "0.0.1",
    { requires: ["spider"] },
);
