YUI.add(
    "solitaire-background-fix",
    function (Y) {
        let _body;

        Y.on("load", resize);
        Y.on("resize", resize);

        function resize() {
            const width = body().get("winWidth"),
                height = body().get("winHeight"),
                style = document.body.style;

            if (!Y.UA.mobile) {
                body().setStyles({ width: width, height: height });
            }

            /*
             * if we don't support the background-size property, use the tiled background instead
             */

            if (
                style.backgroundSize === undefined &&
                style.MozBackgroundSize === undefined
            ) {
                body().setStyles({
                    backgroundImage: "url(greentiled.jpg)",
                    backgroundRepeat: "repeat",
                });
            }
        }

        function body() {
            if (!_body) {
                _body = new Y.Node(document.body);
            }

            return _body;
        }
    },
    "0.0.1",
    { requires: ["solitaire"] },
);
