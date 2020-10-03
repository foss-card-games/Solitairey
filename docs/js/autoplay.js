define(["./solitaire"], function (solitaire) {
    YUI.add(
        "solitaire-autoplay",
        function (Y) {
            Y.namespace("Solitaire.Autoplay");

            const Solitaire = Y.Solitaire,
                Autoplay = Solitaire.Autoplay;
            let whenWon = true,
                autoPlayInterval = null;
            const autoPlayable = [
                "Klondike",
                "Klondike1T",
                "FortyThieves",
                "GClock",
                "Freecell",
                "FlowerGarden",
                "Yukon",
            ];

            Y.on("endTurn", function () {
                if (
                    !whenWon ||
                    autoPlayable.indexOf(Solitaire.game.name()) === -1
                ) {
                    return;
                }

                if (autoPlayInterval === null && isEffectivelyWon()) {
                    Y.fire("autoPlay");
                }
            });

            Y.on("win", function () {
                clearInterval(autoPlayInterval);
                autoPlayInterval = null;
            });

            Y.on("autoPlay", function () {
                autoPlayInterval = setInterval(autoPlay, 130);
            });

            function autoPlay() {
                let played = false;

                Solitaire.game.eachStack(function (stack) {
                    const field = stack.field;

                    if (played || field === "foundation" || field === "deck") {
                        return;
                    }

                    played = !stack.eachCard(function (card) {
                        return !card.autoPlay();
                    });
                });
            }

            function isEffectivelyWon() {
                let stop = false;

                Solitaire.game.eachStack(function (stack) {
                    const field = stack.field;
                    let prevRank = 14;

                    if (stop || (field !== "tableau" && field !== "waste")) {
                        return;
                    }

                    stack.eachCard(function (card) {
                        if (card.rank > prevRank || card.isFaceDown) {
                            stop = true;
                            return false;
                        } else {
                            prevRank = card.rank;
                        }
                    });
                });

                return !stop;
            }

            Y.mix(Autoplay, {
                enable: function () {
                    whenWon = true;
                },

                disable: function () {
                    whenWon = false;
                },
            });
        },
        "0.0.1",
        { requires: ["solitaire"] },
    );
    return {};
});
