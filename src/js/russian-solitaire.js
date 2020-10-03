YUI.add(
    "russian-solitaire",
    function (Y) {
        const Solitaire = Y.Solitaire,
            Yukon = Solitaire.Yukon,
            RussianSolitaire = (Solitaire.RussianSolitaire = Solitaire.instance(
                Yukon,
                {
                    Card: Solitaire.instance(Yukon.Card),
                },
            ));

        RussianSolitaire.Card.validTarget = function (stack) {
            const target = stack.my_Last();

            switch (stack.field) {
                case "tableau":
                    if (!target) {
                        return this.rank === 13;
                    } else {
                        return (
                            !target.isFaceDown &&
                            target.suit === this.suit &&
                            target.rank === this.rank + 1
                        );
                    }
                case "foundation":
                    if (!target) {
                        return this.rank === 1;
                    } else {
                        return (
                            target.suit === this.suit &&
                            target.rank === this.rank - 1
                        );
                    }
                default:
                    return false;
            }
        };
    },
    "0.0.1",
    { requires: ["yukon"] },
);
