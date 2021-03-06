importScripts(
    "libfreecell-solver.min.js",
    "web-fc-solve--expand-moves.js",
    "web-fc-solve.js",
);

let attempts = 0;
const maxFastAttempts = 150000;

function GameState(obj) {
    if (!obj) {
        return;
    }
    let i, stack;

    this.reserve = new Uint8Array(obj.reserve);
    this.foundation = new Uint8Array(obj.foundation);
    this.tableau = [];

    for (i = 0; i < obj.tableau.length; i++) {
        stack = obj.tableau[i];
        this.tableau[i] = [new Uint8Array(stack[0]), stack[1]];
    }
}

GameState.fromState = function (other) {
    const state = new GameState();

    state.tableau = other.tableau;
    state.reserve = other.reserve;
    state.foundation = other.foundation;

    return state;
};

GameState.prototype = {
    reserve: null,
    foundation: null,
    tableau: null,
    rating: null,
    parentMove: null,
    parent: null,
    child: null,

    solved: function () {
        const foundation = this.foundation;

        for (let i = 0, len = 4; i < len; i++) {
            if (foundation[i] >> 2 !== 13) {
                return false;
            }
        }

        return true;
    },

    eachTableau: function (callback) {
        const tableau = this.tableau;

        for (let i = 0, len = tableau.length; i < len; i++) {
            const stack = tableau[i];
            callback.call(this, stack[0], stack[1], i);
        }
    },

    validTarget: function (field, value, start) {
        const rank = value >> 2,
            suit = value & 3;
        let dest, tableau, i, len;

        if (!value) {
            return -1;
        }

        if (start === undefined) {
            start = 0;
        } else {
            start++;
        }

        switch (field) {
            case "foundation":
                for (i = 0; i < 4; i++) {
                    dest = this.foundation[i];

                    if (
                        (!dest && rank === 1) ||
                        (suit === (dest & 3) && rank === (dest >> 2) + 1)
                    ) {
                        return i;
                    }
                }
                break;

            case "reserve":
                for (i = 0; i < 4; i++) {
                    if (!this.reserve[i]) {
                        return i;
                    }
                }
                break;

            case "tableau":
                tableau = this.tableau;

                for (i = start, len = tableau.length; i < len; i++) {
                    dest = tableau[i][0][tableau[i][1] - 1];

                    if (
                        !tableau[i][1] ||
                        ((suit & 1) ^ (dest & 1) && rank === (dest >> 2) - 1)
                    ) {
                        return i;
                    }
                }
                break;
        }

        return -1;
    },

    move: function (sourceField, sourceStack, destField, destStack) {
        const val = this.pop(sourceField, sourceStack);
        this.push(destField, destStack, val);
    },

    pop: function (field, stack) {
        let val, newBuffer, i, len;

        if (field === "reserve" || field === "foundation") {
            val = this[field][stack];

            this[field] = new Uint8Array(this[field]);
            this[field][stack] = 0;
            return val;
        }

        const tableau = this.tableau;
        const bufferLength = tableau[stack][1];

        if (!bufferLength) {
            return 0;
        }

        val = tableau[stack][0][bufferLength - 1];
        this.copyTableau(stack, bufferLength - 1);
        return val;
    },

    push: function (field, stack, val) {
        if (!val) {
            return;
        }

        if (field === "reserve" || field === "foundation") {
            this[field] = new Uint8Array(this[field]);
            this[field][stack] = val;
            return;
        }

        const newLength = this.tableau[stack][1] + 1;
        this.copyTableau(stack, newLength);
        this.tableau[stack][0][newLength - 1] = val;
    },

    copyTableau: function (stack, newLength) {
        const old = this.tableau,
            tableau = old[stack][0],
            newBuffer = new Uint8Array(new ArrayBuffer(newLength));

        for (let i = 0; i < newLength; ++i) {
            newBuffer[i] = tableau[i];
        }

        this.tableau = [];

        for (let i = 0, len = old.length; i < len; ++i) {
            if (i !== stack) {
                this.tableau[i] = old[i];
            } else {
                this.tableau[i] = [newBuffer, newLength];
            }
        }
    },

    sort: function () {
        Array.prototype.sort.call(this.reserve);
        Array.prototype.sort.call(this.foundation);
        this.tableau.sort(function (a, b) {
            return a[0][0] - b[0][0];
        });
    },

    _serialized: null,
    // TODO write a real hash function
    serialize: function () {
        if (this._serialized !== null) {
            return this._serialized;
        }

        let i, j, len, stack;

        this._serialized = "";
        for (i = 0; i < 4; i++) {
            this._serialized += String.fromCharCode(this.reserve[i]);
        }

        this._serialized += "_";

        for (i = 0; i < 4; i++) {
            this._serialized += String.fromCharCode(this.foundation[i]);
        }

        this._serialized += "_";

        for (i = 0; i < 8; i++) {
            stack = this.tableau[i];

            for (j = 0; j < stack[1]; j++) {
                this._serialized += String.fromCharCode(stack[0][j]) + "_";
            }
        }

        return this._serialized;
    },

    // the search heuristic function
    rateMove: function (sourceField, sourceIndex, destField, destIndex) {
        const RATING_FOUNDATION = 1000,
            RATING_CLOSEDTABLEAUFOLLOWUP = 20,
            RATING_FREEFOUNDATIONTARGET = 15,
            RATING_OPENTABLEAU = 15,
            RATING_FREETABLEAUTARGET = 10,
            RATING_OPENRESERVE = 10,
            RATING_TABLEAU = 2,
            RATING_RESERVE = -1,
            RATING_BURYFOUNDATIONTARGET = -5,
            RATING_CLOSEDTABLEAU = -10;
        let rating = 0,
            stack,
            card,
            nextCard,
            followup = false,
            i,
            length;

        // reward moves to the foundation
        if (destField === "foundation") {
            rating += RATING_FOUNDATION;
        }

        if (sourceField === "tableau") {
            stack = this.tableau[sourceIndex];
            length = stack[1];
            card = stack[0][length - 1];

            // reward an opened tableau slot
            if (length === 1) {
                rating += RATING_OPENTABLEAU;
            }

            // reward unburing foundation targets
            for (i = length - 2; i >= 0; i--) {
                if (this.validTarget("foundation", stack[0][i]) > -1) {
                    rating +=
                        RATING_FREEFOUNDATIONTARGET -
                        (length - 2 - i) +
                        (13 - (stack[0][i] >> 2));
                }
            }

            // reward a newly discovered tableau-to-tableau move
            if (this.validTarget("tableau", stack[0][length - 2]) > -1) {
                rating += RATING_FREETABLEAUTARGET;
            }
        }

        // reward an opened reserve slot
        if (sourceField === "reserve") {
            rating += RATING_OPENRESERVE;
            card = this.reserve[sourceIndex];
        }
        // reward any move to the tableau
        if (destField === "tableau") {
            rating += RATING_TABLEAU;

            stack = this.tableau[destIndex];
            length = stack[1];
            // punish a move to the tableau that buries a foundation target
            for (i = length - 1; i >= 0; i--) {
                if (this.validTarget("foundation", stack[0][i]) > -1) {
                    rating += RATING_BURYFOUNDATIONTARGET * (length - i);
                }
            }

            if (stack[1] === 0) {
                // try not to move a card heading a tableau to an empty tableau
                if (
                    sourceField === "tableau" &&
                    this.tableau[sourceIndex][1] === 1
                ) {
                    return -1000;
                }

                // reward a move to an empty stack that can be followed up be another move
                for (i = 0; i < 4; i++) {
                    nextCard = this.reserve[i];
                    if (
                        nextCard >> 2 === (card >> 2) - 1 &&
                        (nextCard & 1) ^ (card & 1)
                    ) {
                        rating +=
                            RATING_CLOSEDTABLEAUFOLLOWUP + (nextCard >> 2);
                        followup = true;
                    }
                }

                for (i = 0; i < 8; i++) {
                    stack = this.tableau[i];
                    nextCard = stack[0][stack[1] - 1];
                    if (
                        nextCard >> 2 === (card >> 2) - 1 &&
                        (nextCard & 1) ^ (card & 1)
                    ) {
                        rating +=
                            RATING_CLOSEDTABLEAUFOLLOWUP + (nextCard >> 2);
                        followup = true;
                    }
                }

                // punish filling a tableau slot with no immediate followup
                if (!followup) {
                    rating += RATING_CLOSEDTABLEAU;
                }
            }
        }

        // penalize moving to the reserve
        if (destField === "reserve") {
            rating += RATING_RESERVE;
        }
        return rating;
    },

    transformParentMove: function () {
        const move = this.parentMove,
            parent = this.parent;

        if (!(move && parent)) {
            return;
        }

        move.source[1] = parent.lastCard(move.source[0], move.source[1]);
        move.dest[1] = parent.lastCard(move.dest[0], move.dest[1]);
    },

    lastCard: function (field, index) {
        switch (field) {
            case "reserve":
            case "foundation":
                return this[field][index];

            case "tableau":
                const stack = this[field][index];
                const length = stack[1];

                return stack[0][length - 1];
        }
    },

    becomeChild: function () {
        const parent = this.parent;

        if (!parent) {
            return;
        }

        parent.child = this;
        this.transformParentMove();
    },
};

// returns the depth of tree to jump up to, or 0 if the solution is found
function solve(state, depth, visited, movesSinceFoundation, fastSearch) {
    let jumpDepth,
        sourceIndex,
        destIndex,
        length,
        val,
        next,
        sourceField,
        destField,
        move,
        scale = 1,
        foundFoundation = false,
        i;

    const moves = [],
        maxDepth = 200;
    /*
     * if the state is the solved board, return
     * for each reserve and tableau stack, find all valid moves
     * for each valid move, create a new game state
     * sort each state by rank, add for each thats undiscoverd, and it as a branch and recurse
     * stop iterating if a child state is solved
     */

    if (depth > maxDepth) {
        return maxDepth;
    }

    /* when the state is solved
     * replace the stack index with its associated move with the actual card that was moved
     * set the parent states child to this state
     * then jump out of the tree
     */
    if (state.solved()) {
        state.becomeChild();
        return 0;
    }

    // find moves from the reserve
    for (i = 0; i < 4; i++) {
        val = state.reserve[i];

        if (!val) {
            continue;
        }

        destIndex = state.validTarget("foundation", val);
        if (destIndex > -1) {
            moves.push({
                source: ["reserve", i],
                dest: ["foundation", destIndex],
            });
            foundFoundation = true;
        }

        if (foundFoundation) {
            break;
        }

        destIndex = 0;
        while (
            (destIndex = state.validTarget("tableau", val, destIndex)) > -1
        ) {
            moves.push({
                source: ["reserve", i],
                dest: ["tableau", destIndex],
            });
        }
    }

    // find moves from the tableau
    const tableau = state.tableau;
    for (i = 0; i < tableau.length; i++) {
        s = tableau[i][0];
        length = tableau[i][1];
        val = s[length - 1];

        if (!val) {
            continue;
        }

        destIndex = state.validTarget("foundation", val);
        if (destIndex > -1) {
            moves.push({
                source: ["tableau", i],
                dest: ["foundation", destIndex],
            });
            foundFoundation = true;
        }

        if (foundFoundation) {
            break;
        }

        destIndex = state.validTarget("reserve", val);
        if (destIndex > -1) {
            moves.push({
                source: ["tableau", i],
                dest: ["reserve", destIndex],
            });
        }

        destIndex = 0;
        while (
            (destIndex = state.validTarget("tableau", val, destIndex)) > -1
        ) {
            moves.push({
                source: ["tableau", i],
                dest: ["tableau", destIndex],
            });
        }
    }

    if (foundFoundation) {
        movesSinceFoundation = 0;
    } else {
        movesSinceFoundation++;
    }

    for (i = 0; i < moves.length; i++) {
        move = moves[i];
        next = GameState.fromState(state);

        sourceField = move.source[0];
        sourceIndex = move.source[1];

        destField = move.dest[0];
        destIndex = move.dest[1];

        next.rating = next.rateMove(
            sourceField,
            sourceIndex,
            destField,
            destIndex,
        );
        next.move(sourceField, sourceIndex, destField, destIndex);
        next.parentMove = move;
        next.parent = state;

        moves[i] = next;
    }

    moves.sort(function (a, b) {
        return b.rating - a.rating;
    });

    // if nothing's been moved to the foundation in many turns, backtrack many steps
    if (movesSinceFoundation >= 20) {
        scale = 0.7;
    }

    if (fastSearch && ++attempts > maxFastAttempts) {
        scale = 0.001;
    }

    for (i = 0; i < moves.length && scale === 1; i++) {
        move = moves[i];
        if (jumpDepth < depth) {
            break;
        }
        if (visited[move.serialize()]) {
            if (fastSearch) {
                break;
            } else {
                continue;
            }
        }

        visited[move.serialize()] = true;
        jumpDepth = solve(
            move,
            depth + 1,
            visited,
            movesSinceFoundation,
            fastSearch,
        );
    }

    if (jumpDepth === 0) {
        state.becomeChild();
    }

    if (jumpDepth === undefined) {
        jumpDepth = Math.ceil(depth * scale);
    }
    return jumpDepth;
}

function mapMoves(state) {
    let child = state.child,
        moves = null,
        current;

    if (!child) {
        return;
    }

    moves = current = child.parentMove;

    while ((child = child.child)) {
        current.next = child.parentMove;
        current = current.next;
    }

    return moves;
}

function _render_state_as_string(obj) {
    let ret = "";

    function _render_suit(c) {
        return ["S", "H", "C", "D"][c & 0x3];
    }

    function _render_rank(c) {
        return [
            "A",
            "2",
            "3",
            "4",
            "5",
            "6",
            "7",
            "8",
            "9",
            "T",
            "J",
            "Q",
            "K",
        ][(c >> 2) - 1];
    }

    const reserve = obj.reserve;
    const foundation = obj.foundation;
    ret +=
        "Foundations:" +
        foundation
            .map(function (c) {
                if (c == 0) {
                    return "";
                } else {
                    return " " + _render_suit(c) + "-" + _render_rank(c);
                }
            })
            .join("") +
        "\n";

    ret +=
        "Freecells:" +
        reserve
            .map(function (c) {
                if (c == 0) {
                    return " -";
                } else {
                    return " " + _render_rank(c) + _render_suit(c);
                }
            })
            .join("") +
        "\n";

    for (let i = 0; i < obj.tableau.length; i++) {
        const stack = obj.tableau[i];
        const l = stack[1];
        const s = stack[0];

        ret += ":";
        for (let j = 0; j < l; j++) {
            const c = s[j];
            ret += " " + _render_rank(c) + _render_suit(c);
        }
        ret += "\n";
    }

    return ret;
}

function attemptSolution(obj, fastSearch) {
    const state_as_string = _render_state_as_string(obj);

    attempts = 0;

    const instance = new FC_Solve({
        cmd_line_preset: "ct",
        // cmd_line_preset: 'default',
        set_status_callback: function () {
            return;
        },
    });

    let solve_err_code = instance.do_solve(state_as_string);

    while (solve_err_code == FCS_STATE_SUSPEND_PROCESS) {
        solve_err_code = instance.resume_solution();
    }

    if (solve_err_code == FCS_STATE_WAS_SOLVED) {
        const buffer = instance.display_expanded_moves_solution({});
        const to_int = function (s) {
            return parseInt(s, 10);
        };

        const moves_ = instance._post_expand_states_and_moves_seq;

        let current = {};
        let pre_current = current;

        const ret_moves = current;
        for (let i = 0; i < moves_.length; i++) {
            const m = moves_[i];

            if (m.type == "m") {
                const str = m.str;

                const move_content = (function () {
                    let matched = str.match(
                        /^Move 1 cards from stack ([0-9]+) to stack ([0-9]+)/,
                    );

                    if (matched) {
                        return {
                            source: ["tableau", to_int(matched[1])],
                            dest: ["tableau", to_int(matched[2])],
                        };
                    }

                    matched = str.match(
                        /^Move a card from (stack|freecell) ([0-9]+) to the foundations/,
                    );

                    if (matched) {
                        return {
                            source: [
                                matched[1] == "stack" ? "tableau" : "reserve",
                                to_int(matched[2]),
                            ],
                            dest: ["foundation", 1],
                        };
                    }

                    matched = str.match(
                        /^Move a card from (stack|freecell) ([0-9]+) to (stack|freecell) ([0-9]+)/,
                    );

                    if (matched) {
                        return {
                            source: [
                                matched[1] == "stack" ? "tableau" : "reserve",
                                to_int(matched[2]),
                            ],
                            dest: [
                                matched[3] == "stack" ? "tableau" : "reserve",
                                to_int(matched[4]),
                            ],
                        };
                    }

                    throw "Must not happen";
                })();

                pre_current = current;
                current.source = move_content.source;
                current.dest = move_content.dest;
                current.next = {};
                current = current.next;
            }
        }
        delete pre_current.next;

        return ret_moves;
    }
    return;
}

onmessage = function (e) {
    let state, solution;
    const data = e.data;

    if (data.action === "solve") {
        solution = attemptSolution(data.param, true);

        if (!solution) {
            solution = attemptSolution(data.param, false);
        }
        self.postMessage({ solution: solution });
    }
};
