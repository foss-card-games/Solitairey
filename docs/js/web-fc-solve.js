define(["require", "exports", "./fcs-validate", "./web-fcs-api-base", "./web-fc-solve--expand-moves", "./french-cards"], function (require, exports, validate, BaseApi, web_fc_solve__expand_moves_1, french_cards_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.FC_Solve = exports.DisplayFilter = exports.FCS_STATE_SUSPEND_PROCESS = exports.FCS_STATE_WAS_SOLVED = exports.FCS_SEQ_BUILT_BY_ALTERNATE_COLOR = exports.FCS_ES_FILLED_BY_ANY_CARD = void 0;
    exports.FC_Solve_init_wrappers_with_module = FC_Solve_init_wrappers_with_module;
    let myalert;
    try {
        if (!alert) {
            myalert = (e) => {
                console.log(e + "\n");
                throw e;
            };
        }
        else {
            myalert = alert;
        }
    }
    catch (x) {
        myalert = (e) => {
            console.log(e + "\n");
            throw e;
        };
    }
    function FC_Solve_init_wrappers_with_module(Module) {
        const module_wrapper = BaseApi.base_calc_module_wrapper(Module);
        module_wrapper.bh_create = Module._black_hole_solver_create;
        module_wrapper.bh_free = Module._black_hole_solver_free;
        module_wrapper.user_alloc = Module._freecell_solver_user_alloc;
        module_wrapper.user_solve_board = Module.cwrap("freecell_solver_user_solve_board", "number", ["number", "string"]);
        module_wrapper.user_resume_solution =
            Module._freecell_solver_user_resume_solution;
        module_wrapper.user_cmd_line_read_cmd_line_preset = Module.cwrap("freecell_solver_user_cmd_line_read_cmd_line_preset", "number", ["number", "string", "number", "number", "number", "string"]);
        module_wrapper.user_get_empty_stacks_filled_by =
            Module._freecell_solver_user_get_empty_stacks_filled_by;
        module_wrapper.user_get_next_move = Module.cwrap("freecell_solver_user_get_next_move", "number", ["number", "number"]);
        module_wrapper.user_get_num_freecells =
            Module._freecell_solver_user_get_num_freecells;
        module_wrapper.user_get_num_stacks =
            Module._freecell_solver_user_get_num_stacks;
        module_wrapper.user_get_num_states_in_collection_long =
            Module._freecell_solver_user_get_num_states_in_collection_long;
        module_wrapper.user_get_num_times_long =
            Module._freecell_solver_user_get_num_times_long;
        module_wrapper.user_get_sequence_move =
            Module._freecell_solver_user_get_sequence_move;
        module_wrapper.user_get_sequences_are_built_by_type =
            Module._freecell_solver_user_get_sequences_are_built_by_type;
        module_wrapper.user_get_unrecognized_cmd_line_flag = Module.cwrap("freecell_solver_user_get_unrecognized_cmd_line_flag", "number", ["number", "number"]);
        module_wrapper.user_get_unrecognized_cmd_line_flag_status = Module.cwrap("freecell_solver_user_get_unrecognized_cmd_line_flag_status", "number", ["number", "number"]);
        module_wrapper.user_current_state_stringify =
            Module._freecell_solver_user_current_state_stringify;
        module_wrapper.user_stringify_move_ptr = Module.cwrap("freecell_solver_user_stringify_move_ptr", "number", ["number", "number", "number", "number"]);
        module_wrapper.user_free = Module._freecell_solver_user_free;
        module_wrapper.user_limit_iterations_long =
            Module._freecell_solver_user_limit_iterations_long;
        module_wrapper.user_get_invalid_state_error_into_string = Module.cwrap("freecell_solver_user_get_invalid_state_error_into_string", "number", ["number", "number", "number"]);
        module_wrapper.user_cmd_line_parse_args_with_file_nesting_count =
            Module.cwrap("freecell_solver_user_cmd_line_parse_args_with_file_nesting_count", "number", [
                "number",
                "number",
                "number",
                "number",
                "number",
                "number",
                "number",
                "number",
                "number",
                "number",
                "number",
            ]);
        module_wrapper.alloc_wrap = ((my_malloc) => {
            return (size, desc, error) => {
                const buffer = my_malloc(size);
                if (buffer === 0) {
                    alert("Could not allocate " + desc + " (out of memory?)");
                    throw error;
                }
                return buffer;
            };
        })(Module.cwrap("malloc", "number", ["number"]));
        module_wrapper.c_free = Module.cwrap("free", "number", ["number"]);
        module_wrapper.fc_solve_Pointer_stringify = (ptr) => {
            return Module.UTF8ToString(ptr, 10000);
        };
        module_wrapper.stringToAscii = (s, outPtr) => {
            return Module.writeArrayToMemory(Module.intArrayFromString(s), outPtr);
        };
        module_wrapper.stringToUTF8 = (s, outPtr, maxBytes) => {
            return Module.stringToUTF8(s, outPtr, maxBytes);
        };
        return module_wrapper;
    }
    const remove_trailing_space_re = /[ \t]+$/gm;
    exports.FCS_ES_FILLED_BY_ANY_CARD = 0;
    exports.FCS_SEQ_BUILT_BY_ALTERNATE_COLOR = 0;
    exports.FCS_STATE_WAS_SOLVED = 0;
    const FCS_STATE_IS_NOT_SOLVEABLE = 1;
    const FCS_STATE_ALREADY_EXISTS = 2;
    const FCS_STATE_EXCEEDS_MAX_NUM_TIMES = 3;
    const FCS_STATE_BEGIN_SUSPEND_PROCESS = 4;
    exports.FCS_STATE_SUSPEND_PROCESS = 5;
    const FCS_STATE_EXCEEDS_MAX_DEPTH = 6;
    const FCS_STATE_ORIGINAL_STATE_IS_NOT_SOLVEABLE = 7;
    const FCS_STATE_INVALID_STATE = 8;
    const FCS_STATE_NOT_BEGAN_YET = 9;
    const FCS_STATE_DOES_NOT_EXIST = 10;
    const FCS_STATE_OPTIMIZED = 11;
    const FCS_STATE_FLARES_PLAN_ERROR = 12;
    const iters_step = 1000;
    const upper_iters_limit = 128 * 1024;
    const fc_solve_2uni_suit_map = { H: "♥", C: "♣", D: "♦", S: "♠" };
    const fc_solve_2uni_suit_map_num = { H: 1, C: 3, D: 2, S: 0 };
    function fc_solve_2uni_card(match, p1, p2, offset, mystring) {
        return p1 + fc_solve_2uni_suit_map[p2];
    }
    function fc_solve_2uni_char_card(match, p1, p2, offset, mystring) {
        const rank = validate.ranks__str_to_int[p1];
        const ret = String.fromCodePoint(fc_solve_2uni_suit_map_num[p2] * 16 + 0x1f0a0 + rank);
        return ret;
    }
    function fc_solve_2uni_found(match, p1, p2, offset, mystring) {
        return fc_solve_2uni_suit_map[p1] + p2;
    }
    const card_re = new RegExp("\\b(" + french_cards_1.rank_re + ")(" + french_cards_1.suit_re + ")\\b", "g");
    const found_re = new RegExp("\\b(" + french_cards_1.suit_re + ")(-[0A2-9TJQK])\\b", "g");
    class DisplayFilter {
        constructor(args) {
            const that = this;
            that.is_unicode_cards = args.is_unicode_cards;
            that.is_unicode_cards_chars = args.is_unicode_cards_chars;
            return;
        }
        unicode_preprocess(out_buffer) {
            const display = this;
            if (!display.is_unicode_cards) {
                return out_buffer;
            }
            return display._replace_found(display.is_unicode_cards_chars
                ? display._replace_char_card(out_buffer)
                : display._replace_card(out_buffer));
        }
        _replace_char_card(s) {
            return s.replace(card_re, fc_solve_2uni_char_card);
        }
        _replace_card(s) {
            return s.replace(card_re, fc_solve_2uni_card);
        }
        _replace_found(s) {
            return s.replace(found_re, fc_solve_2uni_found);
        }
    }
    exports.DisplayFilter = DisplayFilter;
    const _PTR_SIZE = 4;
    const _read_from_file_str_ptr_size = 32;
    const _arg_str_ptr_size = 128;
    const ptr_type = "i32";
    class FC_Solve {
        constructor(args) {
            const that = this;
            that.module_wrapper = args.module_wrapper;
            that._do_not_alert = false;
            that._cached_num_times_long = -1;
            that._cached_num_states_long = -1;
            that.dir_base = args.dir_base;
            that.string_params = args.string_params ? [args.string_params] : null;
            that.set_status_callback = args.set_status_callback;
            that.cmd_line_preset = args.cmd_line_preset;
            that.current_iters_limit = 0;
            that.obj = (() => {
                const ret_obj = that.module_wrapper.user_alloc();
                // TODO : add an option to customise the limit of the
                // iterations count.
                if (ret_obj === 0) {
                    alert("Could not allocate solver instance " + "(out of memory?)");
                    throw "Foo";
                }
                if (that._initialize_obj(ret_obj) !== 0) {
                    if (that._do_not_alert) {
                        that._do_not_alert = false;
                    }
                    else {
                        alert("Failed to initialize solver (Bug!)");
                    }
                    that.module_wrapper.user_free(ret_obj);
                    throw "Bar";
                }
                return ret_obj;
            })();
            that._cached_num_times_long = -1;
            that._cached_num_states_long = -1;
            that.proto_states_and_moves_seq = null;
            that._pre_expand_states_and_moves_seq = null;
            that._post_expand_states_and_moves_seq = null;
            return;
        }
        get_pre_expand_states_and_moves_seq() {
            const that = this;
            return that._pre_expand_states_and_moves_seq;
        }
        set_status(myclass, mylabel) {
            const that = this;
            return that.set_status_callback(myclass, mylabel);
        }
        handle_err_code(solve_err_code) {
            const that = this;
            if (solve_err_code === FCS_STATE_INVALID_STATE) {
                const error_string_ptr = that._error_string_buffer;
                that.module_wrapper.user_get_invalid_state_error_into_string(that.obj, error_string_ptr, 1);
                const error_string = that.module_wrapper.fc_solve_Pointer_stringify(error_string_ptr);
                alert(error_string + "\n");
                throw "Foo";
            }
            else if (solve_err_code === exports.FCS_STATE_SUSPEND_PROCESS) {
                if (that.current_iters_limit >= upper_iters_limit) {
                    that.set_status("exceeded", "Iterations count exceeded at " + that.current_iters_limit);
                    return;
                }
                else {
                    // 50 milliseconds.
                    that.set_status("running", "Running (" + that.current_iters_limit + " iterations)");
                    return;
                }
            }
            else if (solve_err_code === exports.FCS_STATE_WAS_SOLVED) {
                that.set_status("solved", "Solved");
                return;
            }
            else if (solve_err_code === FCS_STATE_IS_NOT_SOLVEABLE) {
                that.set_status("impossible", "Could not solve.");
                return;
            }
            else {
                alert("Unknown Error code " + solve_err_code + "!");
                throw "Foo";
            }
        }
        resume_solution() {
            const that = this;
            that._increase_iters_limit();
            const solve_err_code = that.module_wrapper.user_resume_solution(that.obj);
            that.handle_err_code(solve_err_code);
            return solve_err_code;
        }
        do_solve(proto_board_string) {
            const that = this;
            that.set_status("running", "Running");
            try {
                that._increase_iters_limit();
                // Removed; for debugging purposes.
                // alert("preset_ret = " + preset_ret);
                const board_string = that._process_board_string(proto_board_string);
                const solve_err_code = that.module_wrapper.user_solve_board(that.obj, board_string);
                that.handle_err_code(solve_err_code);
                return solve_err_code;
            }
            catch (e) {
                that.set_status("error", "Error");
                return;
            }
        }
        unicode_preprocess(out_buffer, display) {
            const that = this;
            return display.unicode_preprocess(out_buffer);
        }
        display_solution(args) {
            const that = this;
            const displayer = args.displayer;
            let ret;
            try {
                that._calc_states_and_moves_seq();
                that.set_status("solved", "Solved");
                ret = that._display_specific_sol(that._pre_expand_states_and_moves_seq, displayer);
            }
            catch (e) {
                return;
            }
            return ret;
        }
        display_expanded_moves_solution(args) {
            const that = this;
            that._calc_expanded_seq();
            that.set_status("solved", "Solved");
            return that._display_specific_sol(that._post_expand_states_and_moves_seq, args.displayer);
        }
        calc_expanded_move(idx) {
            const that = this;
            const states_and_moves_sequence = that.proto_states_and_moves_seq;
            if (!states_and_moves_sequence[idx].exp) {
                states_and_moves_sequence[idx].exp = (0, web_fc_solve__expand_moves_1.fc_solve_expand_move)(8, 4, states_and_moves_sequence[idx - 1].str, states_and_moves_sequence[idx].m, states_and_moves_sequence[idx + 1].str);
            }
            return states_and_moves_sequence[idx].exp;
        }
        generic_display_sol(args) {
            const that = this;
            return args.expand
                ? that.display_expanded_moves_solution(args)
                : that.display_solution(args);
        }
        get_empty_stacks_filled_by() {
            const that = this;
            return that.module_wrapper.user_get_empty_stacks_filled_by(that.obj);
        }
        get_num_freecells() {
            const that = this;
            return that.module_wrapper.user_get_num_freecells(that.obj);
        }
        _is_num_times_invalid(iters) {
            return iters < 0;
        }
        get_num_times_long() {
            const that = this;
            if (that._is_num_times_invalid(that._cached_num_times_long)) {
                if (!that.obj) {
                    throw "obj is null when num_times not set.";
                }
                return that._calc_get_num_times_long_based_obj();
            }
            return that._cached_num_times_long;
        }
        _calc_get_num_states_in_collection_long_based_obj() {
            const that = this;
            return that.module_wrapper.user_get_num_states_in_collection_long(that.obj);
        }
        _calc_get_num_times_long_based_obj() {
            const that = this;
            return that.module_wrapper.user_get_num_times_long(that.obj);
        }
        get_num_stacks() {
            const that = this;
            return that.module_wrapper.user_get_num_stacks(that.obj);
        }
        get_num_states_in_collection_long() {
            const that = this;
            if (that._is_num_times_invalid(that._cached_num_states_long)) {
                if (!that.obj) {
                    throw "obj is null when num_times not set.";
                }
                return that._calc_get_num_states_in_collection_long_based_obj();
            }
            return that._cached_num_states_long;
        }
        get_sequence_move() {
            const that = this;
            return that.module_wrapper.user_get_sequence_move(that.obj);
        }
        get_sequences_are_built_by_type() {
            const that = this;
            return that.module_wrapper.user_get_sequences_are_built_by_type(that.obj);
        }
        _check_if_params_match_preset({ empty_stacks_filled_by, sequence_move, sequences_are_built_by_type, wanted_num_freecells, wanted_num_stacks, }) {
            const that = this;
            let reasons = "";
            if (that.get_empty_stacks_filled_by() !== empty_stacks_filled_by) {
                reasons += "Wrong empty_stacks_filled_by!\n";
            }
            if (that.get_num_stacks() !== wanted_num_stacks) {
                reasons += "Wrong number of stacks!\n";
            }
            if (that.get_num_freecells() !== wanted_num_freecells) {
                reasons += "Wrong number of freecells!\n";
            }
            if (that.get_sequence_move() !== sequence_move) {
                reasons += "Wrong sequence_move!\n";
            }
            if (that.get_sequences_are_built_by_type() !==
                sequences_are_built_by_type) {
                reasons += "Wrong sequences_are_built_by_type!\n";
            }
            const verdict = reasons.length == 0;
            return { reasons: reasons, verdict: verdict };
        }
        check_if_params_match_freecell() {
            const that = this;
            let reasons = "";
            const wanted_num_freecells = 4;
            const wanted_num_stacks = 8;
            const empty_stacks_filled_by = exports.FCS_ES_FILLED_BY_ANY_CARD;
            const sequence_move = 0;
            const sequences_are_built_by_type = exports.FCS_SEQ_BUILT_BY_ALTERNATE_COLOR;
            return that._check_if_params_match_preset({
                empty_stacks_filled_by: empty_stacks_filled_by,
                sequence_move: sequence_move,
                sequences_are_built_by_type: sequences_are_built_by_type,
                wanted_num_freecells: wanted_num_freecells,
                wanted_num_stacks: wanted_num_stacks,
            });
        }
        _calc_states_and_moves_seq() {
            const that = this;
            if (that._pre_expand_states_and_moves_seq) {
                return;
            }
            // A sequence to hold the moves and states for post-processing,
            // such as expanding multi-card moves.
            const states_and_moves_sequence = [];
            function _out_state(s) {
                states_and_moves_sequence.push({ type: "s", str: s });
            }
            function get_state_str() {
                that.module_wrapper.user_current_state_stringify(that.obj, that._state_string_buffer, 1, 0, 1);
                return that.module_wrapper.fc_solve_Pointer_stringify(that._state_string_buffer);
            }
            _out_state(get_state_str());
            let move_ret_code;
            // 128 bytes are enough to hold a move.
            const move_buffer = that._move_buffer;
            while ((move_ret_code = that.module_wrapper.user_get_next_move(that.obj, move_buffer)) === 0) {
                const state_as_string = get_state_str();
                that.module_wrapper.user_stringify_move_ptr(that.obj, that._move_string_buffer, move_buffer, 0);
                const move_as_string = that.module_wrapper.fc_solve_Pointer_stringify(that._move_string_buffer);
                states_and_moves_sequence.push({
                    exp: null,
                    is_exp: false,
                    m: {
                        str: move_as_string,
                        type: "m",
                    },
                    type: "m",
                });
                _out_state(state_as_string);
            }
            that.proto_states_and_moves_seq = states_and_moves_sequence;
            that._pre_expand_states_and_moves_seq = states_and_moves_sequence.map((item) => {
                return item.type === "m" ? item.m : item;
            });
            that._post_expand_states_and_moves_seq = null;
            that._cached_num_times_long = that._calc_get_num_times_long_based_obj();
            that._cached_num_states_long =
                that._calc_get_num_states_in_collection_long_based_obj();
            // Cleanup C resources
            that.module_wrapper.user_free(that.obj);
            that.obj = 0;
            that.module_wrapper.c_free(that._state_string_buffer);
            that._state_string_buffer = 0;
            that._move_string_buffer = 0;
            that._move_buffer = 0;
            return;
        }
        _calc_expanded_seq() {
            const that = this;
            if (that._post_expand_states_and_moves_seq) {
                return;
            }
            that._calc_states_and_moves_seq();
            const states_and_moves_sequence = that.proto_states_and_moves_seq;
            const new_array = [states_and_moves_sequence[0]];
            for (let i = 1; i < states_and_moves_sequence.length - 1; i += 2) {
                Array.prototype.push.apply(new_array, that.calc_expanded_move(i));
                new_array.push(states_and_moves_sequence[i + 1]);
            }
            that._post_expand_states_and_moves_seq = new_array;
            return;
        }
        _display_specific_sol(seq, displayer) {
            const that = this;
            let out_buffer = "";
            function my_append(str) {
                out_buffer += str;
            }
            my_append("-=-=-=-=-=-=-=-=-=-=-=-\n\n");
            for (const x of seq) {
                const t_ = x.type;
                const str = x.str;
                my_append(str + (t_ === "s" ? "\n\n====================\n\n" : "\n\n"));
            }
            return that.unicode_preprocess(out_buffer.replace(remove_trailing_space_re, ""), displayer);
        }
        _increase_iters_limit() {
            const that = this;
            that.current_iters_limit += iters_step;
            that.module_wrapper.user_limit_iterations_long(that.obj, that.current_iters_limit);
            return;
        }
        // Ascertain that the string contains a trailing newline.
        // Without the trailing newline, the parser is sometimes confused.
        _process_board_string(proto_board_string) {
            const that = this;
            if (proto_board_string.match(/\n$/)) {
                return proto_board_string + "";
            }
            else {
                return proto_board_string + "\n";
            }
        }
        _stringify_possibly_null_ptr(s_ptr) {
            const that = this;
            return s_ptr
                ? that.module_wrapper.fc_solve_Pointer_stringify(s_ptr)
                : "";
        }
        _initialize_object_buffers() {
            const that = this;
            const _error_string_buffer_size = 512;
            const _state_string_buffer_size = 500;
            const _move_string_buffer_size = 200;
            const _move_buffer_size = 64;
            const _args_buffer_size = _PTR_SIZE * 2;
            const _last_arg_ptr_buffer_size = _PTR_SIZE;
            const _total_buffer_size = _state_string_buffer_size +
                _move_string_buffer_size +
                _move_buffer_size +
                _read_from_file_str_ptr_size +
                _arg_str_ptr_size +
                _args_buffer_size +
                _last_arg_ptr_buffer_size +
                _error_string_buffer_size;
            that._state_string_buffer = that.module_wrapper.alloc_wrap(_total_buffer_size, "state+move string buffer", "Zam");
            if (!that._state_string_buffer) {
                alert("that._state_string_buffer is 0");
            }
            that._move_string_buffer =
                that._state_string_buffer + _state_string_buffer_size;
            that._move_buffer = that._move_string_buffer + _move_string_buffer_size;
            that._read_from_file_str_ptr = that._move_buffer + _move_buffer_size;
            that._arg_str_ptr =
                that._read_from_file_str_ptr + _read_from_file_str_ptr_size;
            that._args_buffer = that._arg_str_ptr + _arg_str_ptr_size;
            that._last_arg_ptr_buffer = that._args_buffer + _args_buffer_size;
            that._error_string_buffer =
                that._last_arg_ptr_buffer + _last_arg_ptr_buffer_size;
        }
        _initialize_obj(obj) {
            const that = this;
            const cmd_line_preset = that.cmd_line_preset;
            try {
                that._initialize_object_buffers();
                if (cmd_line_preset !== "default") {
                    const error_string_ptr_buf = that._error_string_buffer;
                    const preset_ret = that.module_wrapper.user_cmd_line_read_cmd_line_preset(obj, cmd_line_preset, 0, error_string_ptr_buf, 0, null);
                    const error_string_ptr = that.module_wrapper.Module.getValue(error_string_ptr_buf, ptr_type);
                    const error_string = that._stringify_possibly_null_ptr(error_string_ptr);
                    that.module_wrapper.c_free(error_string_ptr);
                    if (preset_ret !== 0) {
                        alert("Failed to load command line preset '" +
                            cmd_line_preset +
                            "'. Problem is: «" +
                            error_string +
                            "». Should not happen.");
                        throw "Foo";
                    }
                }
                if (that.string_params) {
                    const error_string_ptr_buf = that._error_string_buffer;
                    // Create a file with the contents of string_params.
                    // var base_path = '/' + that.dir_base;
                    const base_path = "/";
                    const file_basename = "string-params.fc-solve.txt";
                    const string_params_file_path = base_path + file_basename;
                    that.module_wrapper.Module.FS.writeFile(string_params_file_path, that.string_params[0], {});
                    const args_buf = that._args_buffer;
                    // TODO : Is there a memory leak here?
                    const read_from_file_str_ptr = that._read_from_file_str_ptr;
                    that.module_wrapper.stringToUTF8("--read-from-file", read_from_file_str_ptr, _read_from_file_str_ptr_size);
                    const arg_str_ptr = that._arg_str_ptr;
                    that.module_wrapper.stringToUTF8("0," + string_params_file_path, arg_str_ptr, _arg_str_ptr_size);
                    that.module_wrapper.Module.setValue(args_buf, read_from_file_str_ptr, ptr_type);
                    that.module_wrapper.Module.setValue(args_buf + _PTR_SIZE, arg_str_ptr, ptr_type);
                    const last_arg_ptr = that._last_arg_ptr_buffer;
                    // Input the file to the solver.
                    const args_ret_code = that.module_wrapper.user_cmd_line_parse_args_with_file_nesting_count(obj, 2, args_buf, 0, 0, 0, 0, error_string_ptr_buf, last_arg_ptr, -1, 0);
                    const error_string_ptr = that.module_wrapper.Module.getValue(error_string_ptr_buf, ptr_type);
                    const error_string = that._stringify_possibly_null_ptr(error_string_ptr);
                    that.module_wrapper.c_free(error_string_ptr);
                    if (args_ret_code !== 0) {
                        const unrecognized_opt_ptr = that.module_wrapper.user_get_unrecognized_cmd_line_flag_status(obj, 0) == 0
                            ? that.module_wrapper.user_get_unrecognized_cmd_line_flag(obj, 0)
                            : 0;
                        let unrecognized_opt_s = "";
                        if (unrecognized_opt_ptr != 0) {
                            that._do_not_alert = true;
                            that._unrecognized_opt =
                                that._stringify_possibly_null_ptr(unrecognized_opt_ptr);
                            that.module_wrapper.c_free(unrecognized_opt_ptr);
                            let exception_string = "";
                            if (validate.determine_if_string_is_board_like(that.string_params[0])) {
                                unrecognized_opt_s =
                                    "Did you try inputting the cards' deal in the command-line arguments text box?\n" +
                                        "Unrecognized command line flag: «" +
                                        that._unrecognized_opt +
                                        "».";
                                exception_string =
                                    "CommandLineArgsMayContainCardsArrangement";
                            }
                            else {
                                unrecognized_opt_s =
                                    "The Command Line arguments' textbox should " +
                                        "normally be kept " +
                                        "empty. (It is intended for advanced use!) " +
                                        "There was an unrecognized command line flag: «" +
                                        that._unrecognized_opt +
                                        "».";
                                exception_string = "Bar";
                            }
                            alert(unrecognized_opt_s);
                            throw exception_string;
                        }
                        alert("Failed to process user-specified command " +
                            "line arguments. Problem is: «" +
                            error_string +
                            "».");
                        throw "Foo";
                    }
                }
                return 0;
            }
            catch (e) {
                console.log("Error = " + e + "\n");
                that.set_status("error", "Error");
                return -1;
            }
        }
    }
    exports.FC_Solve = FC_Solve;
});
