YUI.add(
    "spiderette",
    function (Y) {
        const Solitaire = Y.Solitaire,
            Klondike = Solitaire.Klondike,
            Spider = Solitaire.Spider,
            Spiderette = (Y.Solitaire.Spiderette = Solitaire.instance(Spider, {
                height: Klondike.height,
                deal: Klondike.deal,

                Tableau: Solitaire.instance(Spider.Tableau, {
                    stackConfig: Klondike.Tableau.stackConfig,
                }),
                Foundation: Solitaire.instance(Spider.Foundation, {
                    stackConfig: Klondike.Foundation.stackConfig,
                }),

                Deck: Solitaire.instance(Spider.Deck, {
                    count: 1,
                }),
            }));
    },
    "0.0.1",
    { requires: ["klondike", "spider"] },
);
