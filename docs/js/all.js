YUI.add("breakout", function (Y) {
	function clamp (value, min, max) {
		return Math.max(Math.min(value, max), min);
	}

	/*
	 * @attribute rows
	 * @description The number of rows to split the host into. If columns is specified but this isnt, the host is split into squares. Default: 6
	 * @type Integer
	 */

	/*
	 * @attribute columns
	 * @description The number of columns to split the host into. If rows is specified but this isnt, the host is split into squares. Default: 6
	 * @type Integer
	 */

	function Breakout(config) {
		var rows = config.rows,
		    columns = config.columns;

		this._host = config.host;
		this._container = Y.Node.create("<div style='position: absolute'>");
		this._nodes = [];

		if (!(rows || columns)) {
			rows = 8;
		}

		this._rows = rows;
		this._columns = columns;

		Breakout.superclass.constructor.apply(this, arguments);
	}

	Breakout.NS = "breakout";
	Breakout.Name = "Breakout";

	Y.extend(Breakout, Y.Plugin.Base, {
		_splitNode: function () {
			var r, c,
			    x, y,
			    width = Math.round(this._blockWidth),
			    height = Math.round(this._blockHeight),
			    rows = this._rows,
			    columns = this._columns,

			    origin = this._host.getXY(),

			    host,
			    container = this._container,
			    nodes = this._nodes = [],
			    row,
			    
			    mask = Y.Node.create(
				'<div style="width: ' + width + 'px; height: ' + height + 'px; position: absolute; overflow: hidden">'
				);

			container.setXY(origin);

			for (r = 0; r < rows; r++) {
				nodes[r] = row = [];
				y = r * height;

				for (c = 0; c < columns; c++) {
					x = c * width;
					host = this._host.cloneNode(true);

					row[c] = mask.cloneNode()
						.setXY([x, y])
						.append(host.setXY([-x, -y]));
					container.append(row[c]);
				}
			}

			this._swapIn();
		},

		_swapIn: function () {
			this._host.get("parentNode").append(this._container);
			this._host.setStyle("visibility", "hidden");
		},

		_setup: function () {
			if (this._nodes.length) { return; }

			var node = this._host,
			    width = parseFloat(node.getComputedStyle("width")),
			    height = parseFloat(node.getComputedStyle("height")),

			    blockWidth,
			    blockHeight,

			    rows = this._rows,
			    columns = this._columns;

			if (rows) { blockHeight = height / rows; }
			if (columns) { blockWidth = width / columns; }

			if (!rows) {
				blockHeight = blockWidth;
				rows = height / blockHeight;
			}
			
			if (!columns) {
				blockWidth = blockHeight;
				columns = width / blockWidth;
			}

			this._container.setStyles({width: width, height: height});

			this._width = width;
			this._height = height;

			this._blockWidth = blockWidth;
			this._blockHeight = blockHeight;

			this._rows = rows;
			this._columns = columns;

			this._splitNode();
		},

		_forEach: function (effect, options) {
			this._setup();
			this._swapIn();

			var r, c,
			    rows = this._rows,
			    columns = this._columns,
 
			    options = options || {},
			    randomization = Math.abs(options.random || 0),
			    running = 0,
			    anim,
			    piece,
			    delay,
			    
			    container = this._container,
			    that = this;

			options.crop && container.setStyle("overflow", "hidden");

			for (r = 0; r < rows; r++) {
				for (c = 0; c < columns; c++) {
					running++;

					piece = this._nodes[r][c];
					anim = effect.call(this, piece, r, c, rows, columns);
					
					delay = r + c;
					if (options.reverse) {
						delay = rows + columns - delay;
					}

					anim.animation.on("end", function () {
						running--;

						if (!running) {
							that._container.remove();
							
							options.unhide && that._host.setStyle("visibility", "visible");
							options.crop && container.setStyle("overflow", "visible");

							that.fire("end");
						}
					});

					(function (a) {
				    		var random = 1 - (Math.random() * randomization),
						    opacity;

						if (options.fade) {
							opacity = options.unhide ? 0 : 1;
							Y.mix(a.animation.get("from"), {opacity: opacity});
							Y.mix(a.animation.get("to"), {opacity: 1 - opacity});
						} else {
							piece.setStyle("opacity", 1);
						}

						setTimeout(function () {
							a.animation.run();
						}, a.interval * delay * random);
					})(anim);
				}
			}
		},

		explode: function (options) {
			options = options || {};
			if (!("fade" in options)) { options.fade = true; }

			var randomization = Math.abs(options.random || 0);

			this._forEach(function (node, row, column, rows, columns) {
				var distance = (options.distance || 1.5) * 2,
				    duration = options.duration || 1000,
				    easing = options.easing || Y.Easing.easeOutStrong,

				    random = 1 - (Math.random() * randomization),

				    center = {x: (columns - 1) / 2, y: (rows - 1) / 2},
				    delta = {x: column - center.x, y: row - center.y},

				    to;

				distance *= random;

				to  = {left: (delta.x * distance + center.x) * this._blockWidth,
					  top: (delta.y * distance + center.y) * this._blockHeight};

				if (options.unhide) {
					node.setStyles(to);
					to = {left: column * this._blockWidth, top: row * this._blockHeight};
				}
				
				anim = new Y.Anim({
					node: node,
					easing: easing,
					to: to,
					duration: duration / 1000
				});

				return {animation: anim, interval: 0};
			}, options);
		},

		sheer: function (options) {
			options = options || {};


			var distance = options.distance || 1,
			    duration = options.duration || 1000,
			    interval = options.interval || 0,
			    easing = options.easing || Y.Easing.easeIn;
			    
			this._forEach(function (node, row, column, rows, columns) {
				var evenCol = !(column % 2),
				    evenRow = !(row % 2),

				    width = this._width,
				    height = this._height,

				    from = {left: column * this._blockWidth,
					    top: row * this._blockHeight},
				    to = {};

				if (columns === 1) { evenCol = evenRow; }
				if (rows === 1) { evenRow = !evenCol; }

				if (evenCol) {
					if (evenRow) { // go left
						to.left = from.left - distance * width;
					} else { // go down
						to.top = from.top + distance * height;
					}
				} else {
					if (evenRow) { // go up
						to.top = from.top - distance * height;
					} else { // go right
						to.left = from.left + distance * width;
					}
				}

				if (options.unhide) {
					to = from;
				}

				anim = new Y.Anim({
					node: node,
					easing: easing,
					to: to,
					duration: duration / 1000
				});

				return {animation: anim, interval: interval};
			}, options);
		},

		pinwheel: function (options) {
			options = options || {};

			var distance = options.distance || 1,
			    duration = options.duration || 1000,
			    easing = options.easing || Y.Easing.easeOut;
			    
			this._forEach(function (node, row, column, rows, columns) {
				var evenCol = !(column % 2),
				    evenRow = !(row % 2),

				    interval = 0,

				    width = this._blockWidth,
				    height = this._blockHeight,

				    from = {left: column * width,
					    top: row * height,
					    width: width,
					    height: height},
				    to = {};

				if (evenCol) {
					if (evenRow) { // go down
						to.top = from.top + distance * height;
					} else { // go right
						to.left = from.left + distance * width;
					}
				}

				if (evenCol === evenRow) { // shrink height
					to.height = height * (1 - distance);
				} else { //shrink width
					to.width = width * (1 - distance);
				}

				if (options.unhide) {
					to = from;
				}

				anim = new Y.Anim({
					node: node,
					easing: easing,
					to: to,
					duration: duration / 1000
				});

				return {animation: anim, interval: interval};
			}, options);
		},

		disintegrate: function (options) {
			options = options || {};
			options.reverse = true;

			this._forEach(function (node, row, column, rows, columns) {
				var distance = (options.distance || 1.5) * this._height,
				    duration = options.duration || 1000,
				    easing = options.easing || Y.Easing.easeBoth,

				    interval = duration / (rows + columns) * 2,

				    y = row * this._blockHeight,
				    anim;
				    
				if (distance < 0) { row = rows - row - 1}

				if (options.unhide) {
					node.setStyle("top", y - distance);
				} else {
					y += distance;
				}

				anim = new Y.Anim({
					node: node,
					easing: easing,
					to: { top: y },
					duration: duration / 1000
				});

				return {animation: anim, interval: interval};
			}, options);
		},

		fadeOut: function (options) {
			options = options || {};
			options.fade = true;

			this._forEach(function (node, row, column, rows, columns) {
				var duration = options.duration || 700,
				    startOpacity = options.unhide ? 0 : 1,
				    easing = options.easing,
				    interval,
				    anim;

				if (!easing) {
					easing = options.unhide ? Y.Easing.easeOut : Y.Easing.easeInStrong;
				}

				interval = duration / (rows + columns) * 2;

				anim = new Y.Anim({
					node: node,
					easing: easing,
					from: {}, to: {},
					duration: duration / 1000
				});

				return {animation: anim, interval: interval};
			}, options);
		},

		_inverse: function (effect, options) {
			options = options || {};
			options.unhide = true;
			effect.call(this, options);
		},

		unsheer: function (options) {
			this._inverse(this.sheer, options);
		},

		unpinwheel: function (options) {
			this._inverse(this.pinwheel, options);
		},

		converge: function (options) {
			this._inverse(this.explode, options);
		},

		fadeIn: function (options) {
			this._inverse(this.fadeOut, options);
		},

		build: function (options) {
			this._inverse(this.disintegrate, options);
		}
	});

	Y.Breakout = Breakout;
}, "1.0", {requires: ["plugin", "anim"]});
if (!Array.prototype.indexOf) {
  Array.prototype.indexOf = function(elt /*, from*/)  {  
    var len = this.length >>> 0;  
  
    var from = Number(arguments[1]) || 0;  
    from = (from < 0)  
         ? Math.ceil(from)  
         : Math.floor(from);  
    if (from < 0)  
      from += len;  
  
    for (; from < len; from++) {  
      if (from in this &&  
          this[from] === elt)  
        return from;  
    }  
    return -1;  
  };  
}

Array.prototype.flatten = function () {
	var result = [],
	    i,
	    len,
	    item,
	    proto = Array.prototype;

	for (i = 0, len = this.length; i < len; i++) {
		item = this[i];
		if (Object.prototype.toString.call(item) === "[object Array]") {
			proto.push.apply(result, proto.flatten.call(item));
		} else {
			result.push(item);
		}
	}
	return result;
};

function argsArray(args) {
	return Array.prototype.slice.call(args);
}

Array.prototype.last = function () {
	return this[this.length - 1];
};

Array.prototype.deleteItem = function (item) {
	var i = this.indexOf(item);

	i !== -1 && this.splice(i, 1);
};

Array.prototype.shuffle = function () {
	var i = this.length,
	    r,
	    item,
	    temp;

	while (--i) {
		r = ~~(Math.random() * i);
		item = this[i];
		temp = this[r];
		this[r] = item;
		this[i] = temp;
	}
};

Function.prototype.bind = function (o) {
	var f = this;

	return function () {
		var args = argsArray(arguments);

		return f.apply(o, args);
	};
};

Function.prototype.partial = function () {
	var f = this, captured = argsArray(arguments);

	return function () {
		var i, len, args = [].concat(captured);

		for (i = 0, len = arguments.length; i < len; i++) {
			args.push(arguments[i]);
		}

		return f.apply(this, args);
	};
};

function instance(proto, attrs) {
	var maker = new Function(),
	    o,
	    p;

	maker.prototype = proto;
	o = new maker;
	if (typeof attrs === "object") {
		for (p in attrs) {
			if (attrs.hasOwnProperty(p)) {
				o[p] = attrs[p];
			}
		}
	}

	return o;
}

function normalize(valOrFunction) {
	var val = typeof valOrFunction === "function" ? valOrFunction() : valOrFunction;

	return isNaN(val) ? undefined : val;
}

Object.prototype.mapToFloat = function () {
	var p;

	for (p in this) {
		if (this.hasOwnProperty(p)) {
			this[p] = parseFloat(this[p]);
		}
	}

	return this;
}

Object.prototype.mapAppend = function (str) {
	var p;

	for (p in this) {
		if (this.hasOwnProperty(p)) {
			this[p] += str;
		}
	}

	return this;
}

var Game;

YUI.add("solitaire", function (Y) {

var Solitaire = Y.namespace("Solitaire");

function CardDelegate(cfg) {
	CardDelegate.superclass.constructor.call(this, cfg);
}

Y.extend(CardDelegate, Y.DD.Delegate, {
	getCard: function () {
		return this.get("currentNode").getData("target");
	}
});

Y.mix(Solitaire, {
	activeCard: null,
	moves: null,
	selector: "body",
	offset: {left: 50, top: 70},
	padding: {x: 50, y: 50},
	widthScale: 0,

	noop: function () {},

	name: function () {
		var p;

		for (p in Solitaire) {
			if (Solitaire.hasOwnProperty(p) && Solitaire[p] === Game) { return p; }
		}
	},

	container: function () {
		return Y.one(Solitaire.selector);
	},

	width: function () { return this.Card.base.width * this.widthScale; },
	height: function () { return this.Card.base.height * 4.2; },
	maxStackHeight: function () {
		return Solitaire.Application.windowHeight - 
			normalize(this.Tableau.stackConfig.layout.top) -
			Solitaire.offset.top;
	},

	undo: function () {
		Y.fire("undo");
	},

	pushMove: function (move) {
		var moves = Solitaire.moves;
		moves && moves.push(move);
	},

	serialize: function () {
		var serialized = [],
		    lengths = [],
		    data,
		    stacks,
		    i, len;

		Y.Array.each(this.fields, function (field) {
			stacks = this[field.toLowerCase()].stacks;

			for (i = 0, len = stacks.length; i < len; i++) {
				data = stacks[i].serialize();
				serialized.push(data);
				lengths.push(String.fromCharCode(data.length));
			}
		}, this);

		return [String.fromCharCode(serialized.length)].concat(lengths, serialized).join("");
	},

	stationary: function (callback) {
		var updatePosition = Game.Card.updatePosition;

		Game.Card.updatePosition = Solitaire.noop;
		callback.call(this);
		Game.Card.updatePosition = updatePosition;
	},

	unanimated: function (callback) {
		var anim = Y.Solitaire.Animation,
		    animate = anim.animate;

		anim.animate = false;
		callback.call(this);
		anim.animate = animate;
	},

	unserialize: function (serialized) {
		this.unanimated(function () {
			var numStacks = serialized.charCodeAt(0),
			    lengths = serialized.substr(1, numStacks),
			    offset = numStacks + 1,
			    data,
			    fields = this.fields, fieldIndex = -1,
			    stacks = [], stackIndex,
			    stack,
			    i,
			    length;

			for (i = 0, stackIndex = 0; i < numStacks; i++, stackIndex++, offset += length) {
				length = lengths.charCodeAt(i);
				data = serialized.substr(offset, length);

				if (stackIndex === stacks.length) {
					fieldIndex++;
					stacks = this[fields[fieldIndex].toLowerCase()].stacks;
					stackIndex = 0;
				}

				stack = stacks[stackIndex];
				stack.unserialize(data);
				stack.updateCardsPosition();
			}
		});
	},

	save: function (name) {
		var data = this.serialize(),
		    name = name || "saved-game",
		    twoWeeks = 1206900000;

		Y.Cookie.set(name, data, {expires: new Date(new Date().getTime() + twoWeeks)});
	},

	loadGame: function (data) {
		this.unanimated(function () {
			this.setup(function () {
				this.unserialize(data);
			});
		});

		Y.fire("loadGame");
	},

	newGame: function () {
		Y.Cookie.remove("saved-game");
		this.setup(this.deal);

		Game.save("initial-game");

		Y.fire("newGame");
	},

	cleanup: function () {
		Y.Event.purgeElement(this.container());

		//remove custom events
		Y.detach("solitaire|*");

		this.eachStack(function (stack) {
			stack.cleanup();
		});
	},

	setup: function (callback) {
		Game = Solitaire.game = this;

		Y.fire("beforeSetup");

		Solitaire.moves = null;
		Undo.clear();

		this.stationary(function () {
			this.init();
			Y.Solitaire.Animation.initQueue();
			this.createStacks();
			this.createEvents();
			this.createDraggables();
			callback.call(this);

		});

		Solitaire.moves = [];
		Y.fire("afterSetup");

		Y.Solitaire.Animation.dealing = true;

		Game.eachStack(function (s) {
			s.updateCardsStyle();
			s.updateCardsPosition();
		});

		Y.Solitaire.Animation.dealing = false;
	},

	createEvents: function () {
		var container = Y.one(Solitaire.selector);

		container.delegate("dblclick", Game.autoPlay, ".card");
		container.delegate("contextmenu", Game.autoPlay, ".card");

		container.delegate("click", Game.Events.click, ".card");
		container.delegate("touchend", Game.Events.click, ".card");

		Y.on("solitaire|endTurn", Game.Events.endTurn);
		Y.on("solitaire|undo", Game.Events.undo);
	},


	createDraggables: function () {
		var del = new CardDelegate({
			dragConfig: {
				dragMode: "intersect",
				groups: ["open"],
				clickPixelThresh: 0
			},
			container: Solitaire.selector,
			nodes: ".card"
		});
		
		del.dd.plug(Y.Plugin.DDProxy, {
			borderStyle: "none",
			moveOnEnd: false
		});

		del.on("drag:drag", Game.Events.drag);
		del.on("drag:mouseDown", Game.Events.dragCheck);
		del.on("drag:start", Game.Events.dragStart);
		del.on("drag:dropmiss", Game.Events.dragMiss);
		del.on("drag:drophit", Game.Events.drop);
		del.on("drag:end", Game.Events.dragEnd);
	},

	createField: function (field) {
		if (!field) { return; }

		var f = instance(field),
		    stackLayout,
		    stack,
		    stacks,
		    i, len;

		if (field.stackConfig) {
			stackLayout = field.stackConfig.layout;
			stacks = new Array(field.stackConfig.total);
			field.Stack.field = field.field;

			for (i = 0, len = stacks.length; i < len; i++) {

				stack = instance(field.Stack);
				stack.configLayout = stackLayout;

				stack.layout(Y.merge(stackLayout, {
					hoffset: i * stackLayout.hspacing || 0,
					voffset: i * stackLayout.vspacing || 0}), i);

				stacks[i] = stack;
			};
		}


		f.stacks = stacks;

		typeof f.init === "function" && f.init();

		return f;
	},

	createStacks: function () {
		this.eachStack(function (stack) {
			stack.cards = [];
			stack.createNode();
		});
	},

	eachStack: function (callback, fieldName) {
		Game && Y.Array.each(Game.fields, function (name) {
			var currentName = name.toLowerCase(),
			    field = Game[currentName],
			    fname = fieldName || currentName;

			fname === currentName && field.stacks && Y.Array.each(field.stacks, callback);
		});
	},

	resize: function (scale) {
		Y.fire("beforeResize");

		this.scale(scale);

		this.unanimated(function () {
			this.eachStack(function (stack, i) {
				var cards = stack.cards,
				    layout = stack.configLayout;

				stack.adjustRankHeight();
				stack.cards = [];
				stack.layout(Y.merge(layout, {
					hoffset: i * layout.hspacing || 0,
					voffset: i * layout.vspacing || 0}), i);

				stack.updateStyle();

				stack.setCards(cards.length, function (i) {
					var card = cards[i];

					card && card.updateStyle();
					return card;
				});	

				stack.update();
			});
		});

		Y.fire("afterResize");
	},

	scale: function (scale) {
		var Card = Y.Solitaire.Card,
		    base = Card.base,
		    prop;

		Card.scale = scale;

		for (prop in base) {
			if (base.hasOwnProperty(prop)) {
				Card[prop] = base[prop] * scale;
			}
		};
	},

	init: function () {
		var cancel = Solitaire.preventDefault,
		    minX, maxX,
		    fields;

		Y.on("selectstart", cancel, document);
		Y.on("mousedown", cancel, document.body);
		Y.on("contextmenu", function (e) {
			var target = e.target;

			if (target.hasClass("stack") || target.hasClass("card")) {
				e.preventDefault();
			}
		}, document);

		this.scale(1);

		fields = Y.Array.map(Game.fields, function (field) {
			return Game[field.toLowerCase()] = Game.createField(Game[field]);
		});

		// TODO: refactor this conditional into the above iteration
		if (Game.fields.indexOf("Deck" === -1)) {
			Game.deck = Game.createField(Game.Deck);
		}

		// find the game/card width ratio
		minX = Math.min.apply(Math, Y.Array.map(fields, function (f) {
			return Y.Array.map(f.stacks, function (s) { return s.left; });
		}).flatten());

		maxX = Math.max.apply(Math, Y.Array.map(fields, function (f) {
			return Y.Array.map(f.stacks, function (s) { return s.left; });
		}).flatten()) + this.Card.width;

		this.widthScale = (maxX - minX) / this.Card.base.width;
	},

	preventDefault: function (e) {
		e.preventDefault();
	},

	autoPlay: function () {
		var card = typeof this.getCard === "function"
			? this.getCard()
			: this.getData("target");

		card.autoPlay();
	},

	isWon: function () {
		var foundations = this.foundation.stacks,
		    deck = this.deck,
		    total,
		    placed = 0,
		    i, len;

		total = deck.suits.length * 13 * deck.count;
		for (i = 0, len = foundations.length; i < len; i++) {
			placed += foundations[i].cards.length;
		}

		return placed === total;
	},

	win: function () {
		Y.fire("win");
		Y.Cookie.remove("saved-game");
	},

	endTurn: function () {
		Y.fire("endTurn");
	}
});

Y.Solitaire.Events = {
		click: function (e) {
			var card = e.target.getData("target");

			if (card.dragging) { return; }

			card.dragging = false;
			card.turnOver(e);
			Solitaire.moves.reverse();
			Solitaire.endTurn();
			e.preventDefault();
		},

		clickEmptyDeck: function () {
			Game.redeal();
			Solitaire.moves.reverse();
			Solitaire.endTurn();
		},

		drag: function () {
			this.getCard().dragging = true;
		},

		dragCheck: function () {
			var card = this.getCard(),
			    stack = card.createProxyStack();

			if (!stack) { return; }

			Solitaire.activeCard = card;

			Game.eachStack(function (stack) {
				stack.updateDragGroups();
			});
		},

		dragStart: function () {
			var card = this.getCard(),
			    node = this.get("dragNode"),
			    proxy = card.createProxyNode();

			if (proxy) {
				node.setContent(proxy);
				!card.proxyStack && Y.one(".yui3-dd-shim").setStyle("cursor", "not-allowed");
			}
		},

		dragMiss: function () {
			var card = this.getCard();

			Game.unanimated(function () {
				card.updatePosition();
			});
		},

		dragEnd: function () {
			var target = this.getCard(),
			    root = Solitaire.container(),
			    fragment = new Y.Node(document.createDocumentFragment()),
			    dragNode,
			    node,

			    dragXY = this.dd.realXY,
			    containerXY = root.getXY(),

			    cards,
			    
			    stack,
			    proxyStack = target.proxyStack;

			target.dragging = false;
			dragNode = this.get("dragNode");
			node = dragNode.get("firstChild");

			node && node.remove();

			if (!proxyStack) { return; }

			cards = proxyStack.cards;
			stack = target.stack;

			proxyStack.left = dragXY[0] - containerXY[0];
			proxyStack.top = dragXY[1] - containerXY[1];

			Game.unanimated(function() {
				proxyStack.updateCardsPosition();
			});

			Y.Array.each(cards, function (card) {
				if (!card) { return; }

				card.proxyStack = null;
				fragment.append(card.node);
			});

			root.append(fragment);

			stack.updateCardsPosition();
		},

		drop: function (e) {
			if (!Solitaire.activeCard) { return; }

			var card = Solitaire.activeCard,

			    stack = card.proxyStack,
			    origin = card.stack,
			    target,
			    first;
		       
			if (stack) {
				first = stack.first();

				target = e.drop.get("node").getData("target");

				target = target.stack || target;

				if ((stack.cards.length === 1 && first.validTarget(target)) ||
				    stack.validTarget(target)) {

					target.pushStack(stack);
				}
			}

			Solitaire.endTurn();
		},

		endTurn: function () {
			Solitaire.moves.length && Undo.push(Solitaire.moves);
			Solitaire.moves = [];
			Solitaire.activeCard = null;
			Game.eachStack(function (s) {
				s.updateCardsStyle();
			});

			if (Game.isWon()) {
				Game.win();
			} else {
				Game.save();
			}
		},

		undo: function () {
			var args = argsArray(arguments);

			args.unshift("endTurn");
			Undo.undo();
			Y.fire.apply(Y, args);
		}
};

Y.Solitaire.Deck = {
		count: 1,
		suits: ["c", "d", "h", "s"],

		init: function (seed) {
			var suits = this.suits,
			    suit, s,
			    rank,
			    count,
			    Card = Game.Card;

			this.cards = [];

			for (count = 0; count < this.count; count++) {
				for (rank = 1; rank <= 13; rank++ ) {
					for (s = 0; suit = suits[s]; s++) {
						this.cards.push(Card.create(rank, suit).faceDown());
					}
				}
			}

			if (seed === undefined) {
				this.cards.shuffle();
			} else {
				this.msSeededShuffle(seed);
			}
		},

		// shuffle the deck using the "Microsoft Number"
		msSeededShuffle: function (seed) {
			var cards = this.cards,
			    maxInt = Math.pow(2, 31),
			    rand,
			    temp,
			    i;

			for (i = cards.length; i > 1; i--) {
				// simulate x86 integer overflow
				seed = ((214013 * seed) % maxInt + 2531011) % maxInt;
				rand = (seed >> 16) & 0x7fff;

				item = cards[i - 1];
				temp = cards[rand % i];
				cards[i - 1] = temp;
				cards[rand % i] = item;
			}
		},

		createStack: function () {
			var i;

			for (i = this.cards.length - 1; i >= 0; i--) {
				this.stacks[0].push(this.cards[i]);
			}
		},

		last: function () {
			return this.cards.last();
		},

		pop: function () {
			return this.cards.pop();
		}
	};

Y.Solitaire.Card = {
		zIndex: 1,
		index: -1,
		width: null,
		height: null,
		rankHeight: null,
		hiddenRankHeight: null,
		isFaceDown: false,
		positioned: false,
		scale: 1,
		stack: null,
		proxyStack: null,
		ghost: true,
		dragging: false,
		node: null,
		callback: null,
		left: 0,
		top: 0,

		base: {
		},

		origin: {
			left: function () {
				var offset = Solitaire.container().getXY()[0];
				
				return -offset - Y.Solitaire.Card.width;
			},
			top: function () {
				var offset = Solitaire.container().getXY()[1];

				return -offset - Y.Solitaire.Card.height;
			}
		},

		animSpeeds: {slow: 0.5, mid: 0.2, fast: 0.1},

		create: function (rank, suit) {
			var colors = {c: 0, s: 0, h: 1, d: 1};

			return instance(this, {rank: rank, suit: suit, color: colors[suit]});
		},

		truncatePosition: function () {
			this.left = Math.floor(this.left);
			this.top = Math.floor(this.top);
		},

		faceDown: function (undo) {
			this.isFaceDown = true;
			this.setRankHeight();
			this.setImageSrc();

			undo || Solitaire.pushMove({card: this, faceDown: true});

			return this;
		},

		faceUp: function (undo) {
			this.isFaceDown = false;
			this.setRankHeight();
			this.setImageSrc();

			undo || Solitaire.pushMove({card: this, faceDown: false});

			return this;
		},

		setRankHeight: function () {
			var stack = this.stack,
			    rh, hh;

			if (stack && stack.rankHeight) {
				rh = stack.rankHeight;
				hh = stack.hiddenRankHeight;
			} else {
				rh = Solitaire.Card.rankHeight;
				hh = Solitaire.Card.hiddenRankHeight;
			}

			this.rankHeight = this.isFaceDown ? hh : rh;
		},

		imageSrc: function () {
			var src = this.base.theme + "/";

			src += this.isFaceDown ?
				"facedown" :
				this.suit + this.rank;

			src += ".png";
			
			return src;
		},

		setImageSrc: function () {
			var n = this.node;

			n && n.setAttribute("src", this.imageSrc());
		},

		wrapperStyle: function () {
			return {
				left: this.left,
				top: this.top,
				width: Math.floor(this.width),
				height: Math.floor(this.height)
			};
		},

		updateStyle: function () {
			var n = this.node;

			n && n.setStyles(this.wrapperStyle());
			this.setRankHeight();
		},

		turnOver: function (e) {
			if (!this.isFaceDown) { return; }

			var stack = this.stack;

			if (stack.field === "deck") {
				Game.turnOver();
			} else if (this.isFree()) {
				this.faceUp();
			}

			e.stopPropagation();
		},

		autoPlay: function () {
			var origin = this.stack,
			    last = origin.last(),
			    stacks,
			    foundation,
			    i, len;

			if (this.isFaceDown || origin.field === "foundation") { return; }

			stacks = Game.foundation.stacks;
			for (i = 0, len = stacks.length; i < len; i++) {
				foundation = stacks[i];
				if (this.isFree() && this.validTarget(foundation)) {
					this.moveTo(foundation);
					origin.updateCardsPosition();
					origin.update();

					Solitaire.endTurn();
					return true;
				}
			}

			return false;
		},

		ensureDOM: function () {
			!this.node && this.createNode();
		},

		isFree: function () {
			return this === this.stack.last();
		},

		playable: function () {
			return this.stack.field === "deck" || (this.isFree() && (this.stack.field !== "foundation"));
		},

		createNode: function () {
			var groups,
			    node,
			    card = this;

			node = this.node = Y.Node.create("<img class='card'>")
				.setData("target", this)
				.setAttribute("src", this.imageSrc())
				.plug(Y.Plugin.Drop, {
					useShim: false
				});

			node.setStyles({left: -this.width, top: -this.height});
			//this.updateStyle();
			this.setRankHeight();

			Solitaire.container().append(node);
		},
		
		destroyNode: function () {
			var n = this.node;

			n && n.clearData().destroy(true);
		},

		createProxyStack: function () {
			if (this.isFaceDown || this.stack.field === "foundation") {
				this.proxyStack = null;
				return null;
			}

			var stack = instance(this.stack, {
				proxy: true,
				stack: this.stack
			    }),
			    cards = stack.cards,
			    card,
			    i, len;

			stack.cards = [];
			stack.push(this, true);

			for (i = cards.indexOf(this) + 1, len = cards.length; i < len; i++) {
				card = cards[i];
				if (stack.validProxy(card)) {
					stack.push(card, true);
				} else {
					break;
				}
			}

			this.proxyStack = i === len ? stack : null;

			return this.proxyStack;
		},

		proxyCards: function () {
			return this.proxyStack.cards;
		},

		createProxyNode: function () {
			var node = Y.Node.create("<div>"),
			    stack = this.proxyStack;

			// if the card isn't playable, create ghost copy
			if (!stack) {
				if (!this.ghost) { return null; }

				node.setStyles({
					opacity: 0.6,
					top: -this.top,
					left: -this.left
				}).append(this.node.cloneNode(true));
			} else {
				node.setStyles({opacity: 1, top: -this.top, left: -this.left});

				Y.Array.each(this.proxyCards(), function (c) {
					c.proxyStack = stack;
					node.append(c.node);
				});
			}

			return node;
		},

		updatePosition: function (fields) {
			if (!this.node) { return; }

			var to = {left: this.left + "px", top: this.top + "px", zIndex: this.zIndex},
			    origin = this.origin;

			if (!this.positioned) {
				this.node.setStyles({left: normalize(origin.left), top: normalize(origin.top)});
			}

			Y.Solitaire.Animation.init(this, to, fields);
		},

		pushPosition: function () {
			var index = this.index >= 0 ?
				this.index :
				this.stack.cards.indexOf(this);

			Solitaire.pushMove({
				card: this,
				index: index,
				from: this.stack
			});
		},

		moveTo: function (stack) {
			var origin = this.stack;

			this.pushPosition();
			origin.deleteItem(this);
			stack.push(this);

			Y.fire(origin.field + ":afterPop", origin);

			return this;
		},

		after: function (callback) {
			this.callback = callback;
		},

		runCallback: function () {
			if (this.callback) {
				this.callback.call(this);
				this.callback = null;
			}
		}
	};

Y.Solitaire.Stack = {
		cards: null,
		node: null,
		images: {
			tableau: "freeslot.png",
			deck: "freeslot.png",
			reserve: "freeslot.png",
			foundation: "freeslot.png"
		},

		serialize: function () {
			var i, len,
			    cards = this.cards,
			    card,
			    suits = Game.deck.suits,
			    bite,
			    serialized = [];

			for (i = 0, len = cards.length; i < len; i++) {
				card = cards[i];
				if (card) {
					bite = suits.indexOf(card.suit) |
						card.rank << 2 |
						card.isFaceDown << 6; // type coersion!
				} else {
					bite = 128;
				}
				serialized.push(String.fromCharCode(bite));
			}

			return serialized.join("");
		},

		eachCard: function (callback) {
			var i, len,
			    cards = this.cards;

			for (i = 0, len = cards.length; i < len; i++) {
				if (cards[i]) {
					if (callback.call(this, cards[i], i) === false) { return false; }
				}
			}

			return true;
		},

		setCards: function (count, cardGen) {
			var i, len,
			    card, cards,
			    empty = instance(Game.Card, {
				updatePosition: Solitaire.noop,
				ensureDOM: Solitaire.noop
			    });

			cards = this.cards = [];

			for (i = 0; i < count; i++) {
				card = cardGen.call(this, i) || empty;
				this.push(card);
			}

			for (i = 0; i < count; i++) {
				if (cards[i] === empty) {
					cards[i] = null;
				}
			}
		},

		updateCardsPosition: function () {
			var cards = this.cards;

			Game.stationary(function () {
				this.proxy || this.adjustRankHeight();
				this.setCards(cards.length, function (i) {
					var card = cards[i];

					if (card) {
						card.stack = this;
						card.setRankHeight();
					}

					return card;
				});
			}.bind(this));

			this.eachCard(function (c) {
				c.updatePosition();
			});
		},

		updateCardsStyle: function () {
			var field = this.field;

			field === "foundation" || this.eachCard(function (c) {
				if (c.playable()) {
					c.node.addClass("playable");
				} else {
					c.node.removeClass("playable");
				}
			});
		},

		unserialize: function (serialized) {
			var deck = Game.deck,
			    Card = Game.Card;

			this.setCards(serialized.length, function (i) {
				var value,
				    card;

				value = serialized.charCodeAt(i);

				if (value === 128) {
					card = null;
				} else {
					card = Card.create(
						(value >> 2) & 15, // rank
						deck.suits[value & 3] // suit
					);

					value & 64 ? card.faceDown(true) : card.faceUp(true);
				}

				return card;
			});

			this.update();
		},

		imageSrc: function () {
			var basename = this.images[this.field];

			return basename ? Solitaire.Card.base.theme + "/" + basename : "trans.gif";
		},

		layout: function (layout) {
			var hoffset = layout.hoffset * Y.Solitaire.Card.width,
			    voffset = layout.voffset * Y.Solitaire.Card.height,
			    gameOffset = Solitaire.offset,
			    self = this;

			Y.Array.each(["top", "left"], function (p) {
				self[p] = normalize(layout[p]);
			});

			this.left += hoffset + gameOffset.left;
			this.top += voffset + gameOffset.top;
		},

		deleteItem: function (card) {
			this.cards.deleteItem(card);
		},

		push: function (card, temp) {
			var last = this.last(),
			    to = this.field,
			    from = card.stack ? card.stack.field : "deck";

			/*
			 * TODO: should zIndex setting up in setCardPosition?
			 */

			if (last) { card.zIndex = last.zIndex + 1; }
			else if (to === "deck" || to === "foundation") { card.zIndex = 200; }
			else if (from === "deck") { card.zIndex = Game.Card.zIndex; }

			if (!temp) {
				card.stack = this;
				this.setCardPosition(card);
				card.truncatePosition();
				card.ensureDOM();
			}

			this.cards.push(card);
			temp || card.updatePosition({from: from, to: to});
		},

		pushStack: function (proxy) {
			var origin = Solitaire.activeCard.stack,
			    stack = this;

			/* save the card's index in the stack so we can properly undo this move */
			origin.eachCard(function (card, i) {
				card.index = i;
			});

			Game.stationary(function () {
				proxy.eachCard(function (card) {
					card.moveTo(stack);
					card.index = -1;
				});
				origin.eachCard(function (card) {
					card.index = -1;
				});
			});

			origin.updateCardsPosition();
			origin.update();

			Y.fire(stack.field + ":afterPush", stack);
		},

		adjustRankHeight: function () {
			var cards = this.cards,
			    card,
			    last = this.last(),
			    max = Game.maxStackHeight(),

			    sumHidden = 0,
			    sumVisible = 0,
			    sumRankHeights,

			    height = 0,
			    Card = Solitaire.Card,
			    countHidden = 0, countVisible = 0,
			    rhHidden, rhVisible,
			    i, len;

			if (cards.length <= 1) { return; }

			for (i = 0, len = cards.length - 1; i < len; i++) {
				// if gaps in the stack are allowed, the stack's layed out horizontally
				if (!cards[i]) { return; }

				if (cards[i].isFaceDown) {
					sumHidden += Card.hiddenRankHeight;
					countHidden++;
					height += Card.hiddenRankHeight;
				} else {
					sumVisible += Card.rankHeight;
					countVisible++;
					height += Card.rankHeight;
				}
			}

			if (last) {
				height += last.height;
				sumRankHeights = max - last.height;
			}

			if (height <= max) {
				this.rankHeight = 0;
				this.hiddenRankHeight = 0;
				return;
			}

			rhHidden = sumRankHeights * (sumHidden / (sumHidden + sumVisible)) / countHidden;
			rhVisible = sumRankHeights * (sumVisible / (sumHidden + sumVisible)) / countVisible;

			this.hiddenRankHeight = Math.floor(rhHidden);
			this.rankHeight = Math.floor(rhVisible);
		},

		first: function () { 
			return this.cards[0];
		},

		last: function () {
			return this.cards.last();
		},

		index: function () {
			return Game[this.field].stacks.indexOf(this);
		},

		next: function () {
			return Game[this.field].stacks[this.index() + 1];
		},

		setCardPosition: function (card) {
			card.top = this.top;
			card.left = isNaN(this.left) ? null : this.left;
		},

		wrapperStyle: function () {
			return {
				left: Math.floor(this.left),
				top: Math.floor(this.top),
				width: Math.floor(Y.Solitaire.Card.width),
				height: Math.floor(Y.Solitaire.Card.height)
			};
		},

		updateStyle: function () {
			var n = this.node;

			n && n.setStyles(this.wrapperStyle());
		},

		createNode: function () {
			var node = this.node;

			node = this.node = Y.Node.create("<img class='stack'>")
				.setAttribute("src", this.imageSrc())
				.setData("target", this)
				.plug(Y.Plugin.Drop, {
					useShim: true
				});

			this.updateStyle();

			Solitaire.container().append(node);
		},

		cleanup: function () {
			var n = this.node;

			n && n.clearData().destroy(true);

			this.eachCard(function (c) {
				c.destroyNode();
			});
		},

		updateDragGroups: function () {
			var active = Solitaire.activeCard,
			    cards = this.cards,
			    last = this.last(),
			    drop,
			    i = cards.length - 1;

			this.eachCard(function (c) {
				c.node.drop.removeFromGroup("open");
			});

			if (active.validTarget(this)) {
				if (last) {
					last.node.drop.addToGroup("open");
				}
				this.node.drop.addToGroup("open");
			} else {
				this.node.drop.removeFromGroup("open");
			}
		},

		validCard: function () { return true; },

		validProxy: function (card) {
			return card && card.validTarget(this) && this.validCard(card);
		},

		update: function () {}
	};

Y.Solitaire.Animation = {
		animate: true,
		dealing: false,
		duration: 0.5, // seconds
		interval: 20, // milliseconds
		queue: new Y.AsyncQueue(),

		init: function (card, to, fields) {
			if (!this.animate) {
				card.node.setStyles(to);
				card.positioned = true;
				setTimeout(function () {
					card.runCallback();
				}, 0);
				return;
			}

			var node = card.node,
			    q = this.queue,
			    speeds = card.animSpeeds,
			    from = {top: node.getStyle("top"), left: node.getStyle("left")}.mapToFloat().mapAppend("px"),
			    zIndex = to.zIndex,
			    duration,
			    anim;
		       
			if (from.top === to.top && from.left === to.left) { return; }

			if (this.dealing) {
				duration = speeds.slow;
			} else if (!fields ||
			    fields.from === fields.to ||
			    fields.to === "waste" ||
			    fields.to === "foundation") {
				duration = speeds.fast;
			} else if (fields.from === "deck") {
				duration = speeds.slow;
			} else {
				duration = speeds.mid;
			}

			node.setStyle("zIndex", 500 + zIndex);
			delete to.zIndex;

			anim = new Y.Anim({
				node: node,
				from: from,
				to: to,
				easing: Y.Easing.easeOut,
				duration: duration
			});

			anim.on("end", function () {
				card.positioned = true;
				node.setStyle("zIndex", zIndex);
				card.runCallback();
			});

			q.add(function () { anim.run(); });
			q.run();
		},

		initQueue: function () {
			var q = this.queue;

			q.defaults.timeout = this.interval;
		}
	};

var Undo = {
	stack: null,

	clear: function () {
		this.stack = [];
	},

	push: function (moves) {
		this.stack.push(moves);
	},

	pop: function () {
		return this.stack.pop() || [];
	},

	undo: function () {
		var stacks;

		stacks = Y.Array.unique(Y.Array.map(this.pop(), this.act).flatten());

		Y.Array.each(stacks, function (stack) {
			if (stack) {
				stack.updateCardsPosition();
				stack.update(true);
			}
		});
	},

	act: function (move) {
		var from = move.from,
		    card = move.card,
		    to = card.stack,
		    cards = to.cards;

		if (from) {
			if (from === card.stack) {
				cards[cards.indexOf(card)] = null;
			} else {
				cards.deleteItem(card);
			}

			from.cards[move.index] = card;

			card.stack = from;

			Solitaire.container().append(card.node);
		}

		if ("faceDown" in move) {
			move.faceDown ? card.faceUp(true) : card.faceDown(true);
		}

		return [to, from];
	}
};

}, "0.0.1", {requires: ["dd", "dd-plugin", "dd-delegate", "anim", "async-queue", "cookie", "array-extras"]});
YUI.add("solitaire-ios", function (Y) {
	if (!Y.UA.ios) { return; }

	var Solitaire = Y.Solitaire,
	    _scale = Solitaire.scale,

	    LANDSCAPE = 0,
	    PORTRAIT = 1,

	    BARE_LAYOUT = {
	    	hspacing: 0,
		vspacing: 0,
		left: 0,
		top: 0,
	    },

	    DEFAULTS = {
	    	scale: 1,
		offset: 60,
		maxStackHeight: 155
	    },

	    OPTIONS = {
		Agnes: {offset: [null, 5], maxStackHeight: 260},
		FlowerGarden: {offset: [-60, 5], maxStackHeight: 235},
		Freecell: {scale: [1, 0.93], offset: [35, 5]},
		Golf: {scale: [1.1, 1], offset: [45, 8]},
		GClock: {scale: 0.93, offset: 5, maxStackHeight: 130},
		Klondike: {offset: [null, 5], maxStackHeight: [null, 340]},
		MonteCarlo: {scale: [0.88, 1], offset: [80, 15]},
		Pyramid: {offset: 20},
		Scorpion: {offset: 5, maxStackHeight: [235, 380]},
		Spider: {scale: [1.13, 0.79], offset: [5, 2], maxStackHeight: [160, 340]},
	    	TriTowers: {scale: 0.90, offset: 10},
		Yukon: {scale: [0.95, 1], offset: [50, 5], maxStackHeight: [235, 390]}
	    },

	    gameOverrides = {
		Agnes: function () {
			var hspacing = {hspacing: 1.13};

			fieldLayout(this, "Reserve", Y.merge(hspacing, {
				top: 60
			}));

			fieldLayout(this, "Tableau", Y.merge(hspacing, {
				top: 145
			}));

			fieldLayout(this, "Foundation", Y.merge(hspacing, {
				left: 135
			}));
		},

		FlowerGarden: [
			function () {
				this.Card.rankHeight = 15;

				fieldLayout(this, "Reserve", {
					top: 0,
					left: 70
				});

				fieldLayout(this, "Foundation", {
					top: 0,
					left: 470,
					hspacing: 0,
					vspacing: 1.1
				});

				fieldLayout(this, "Tableau", {
					top: 0,
					left: 140
				});

				Y.mix(this.Reserve.Stack, {
					setCardPosition: function (card) {
						var last = this.cards.last(),
						    top = last ? last.top + 11 : this.top,
						    left = this.left;

						card.left = left;
						card.top = top;
					},

					update: Solitaire.noop
				}, true);
			},

			function () {
				var setCardPosition = Solitaire.FlowerGarden.Reserve.Stack.setCardPosition;

				return function () {
					fieldLayout(this, "Tableau", {
						left: 10,
						top: 120
					});

					fieldLayout(this, "Reserve", {
						left: 17,
						top: 60
					});

					fieldLayout(this, "Foundation", {
						left: 55,
						top: 0,
						hspacing: 1.5,
						vspacing: 0
					});

					Y.mix(this.Reserve.Stack, {
						setCardPosition: setCardPosition,
						update: Solitaire.noop
					}, true);
				};
			}()
		],

		Freecell: [
			originalLayout("Freecell", ["Foundation", "Reserve", "Tableau"]),

			function () {
				var hspacing = {hspacing: 1.05};

				fieldLayout(this, "Tableau", hspacing);

				fieldLayout(this, "Reserve", hspacing);

				fieldLayout(this, "Foundation", Y.merge(hspacing, {
					left: 157
				}));
			}
		],

                Golf: [
                        originalLayout("Golf", ["Tableau", "Foundation"]),

                        function () {
                                fieldLayout(this, "Tableau", {hspacing: 1.1});
                                fieldLayout(this, "Foundation", {left: 132});
                        }
                ],

		GClock: function () {
			fieldLayout(this, "Foundation", {
				left: 143,
			});

			fieldLayout(this, "Tableau", {
				left: 0,
				top: 250,
				hspacing: 1.05
			});
		},

		Klondike: [
			function () {
				originalLayout("Klondike", "Foundation").call(this);
				originalLayout("Klondike", "Tableau").call(this);
			},

			function () {
				Y.mix(this.Foundation.stackConfig.layout, {left: 135, hspacing: 1.13}, true);
				Y.mix(this.Tableau.stackConfig.layout, {hspacing: 1.13}, true);
			}
		],

		MonteCarlo: function () {
			fieldLayout(this, "Tableau", {
				cardGap: 1.1,
				vspacing: 1.05
			});
		},

		Pyramid: [
			function () {
				var deck = originalLayout("Pyramid", "Deck");
				var waste = originalLayout("Pyramid", "Waste");

				return function () {
					deck.call(this);
					waste.call(this);

					Y.mix(this.Tableau.stackConfig.layout, {
						left: 190,
						cardGap: 1.1,
						hspacing: -0.55
					}, true);
				}
			}(),

			function () {
				Y.mix(this.Deck.stackConfig.layout, {
					left: -10,
					top: 300,
				}, true);

				Y.mix(this.Waste.stackConfig.layout, {
					top: 300,
				}, true);

				Y.mix(this.Tableau.stackConfig.layout, {
					left: 120,
					cardGap: 1.1,
					hspacing: -0.55
				}, true);
			}
		],

		Scorpion: [
			function () {
				fieldLayout(this, "Deck", {top: 0, left: 0});
				fieldLayout(this, "Foundation", {
					top: 0,
					left: 420,
					hspacing: 0,
					vspacing: 1.1
				});
				fieldLayout(this, "Tableau", {
					left: 60,
					top: 0,
					hspacing: 1.13
				});
			},

			function () {
				fieldLayout(this, "Deck", {left: 10, top: 0});

				fieldLayout(this, "Foundation", {
					left: 75,
					top: 0,
					hspacing: 1.5,
					vspacing: 0
				});

				fieldLayout(this, "Tableau", {
					left: 0,
					top: 60,
					hspacing: 1.13
				});
			}
		],

		Spider: [
			function () {
				fieldLayout(this, "Foundation", {
					left: 94,
					hspacing: 1.05
				});

				fieldLayout(this, "Tableau", {
					top: 65,
					hspacing: 1.05
				});
			},
			function () {
				fieldLayout(this, "Foundation", {
					left: 62,
					hspacing: 1
				});

				fieldLayout(this, "Tableau", {
					hspacing: 1
				});
			}
		],

		TriTowers: function () {
			Y.mix(this.Tableau.stackConfig.layout, {
				hspacing: -0.5,
				rowGaps: [3, 2, 1, 0],
				cardGap: 1
			}, true);
		},

		RussianSolitaire: [
			originalLayout("RussianSolitaire", ["Tableau", "Foundation"]),

			function () {
				fieldLayout(this, "Tableau", {
					top: 55,
					hspacing: 1.13
				});

				fieldLayout(this, "Foundation", {
					left: 46,
					top: 0,
					hspacing: 1.5,
					vspacing: 0
				});
			}
		],

		Yukon: [
			originalLayout("Yukon", ["Tableau", "Foundation"]),

			function () {
				fieldLayout(this, "Tableau", {
					top: 55,
					hspacing: 1.13
				});

				fieldLayout(this, "Foundation", {
					left: 46,
					top: 0,
					hspacing: 1.5,
					vspacing: 0
				});
			}
		]
	    };

	OPTIONS.FortyThieves = OPTIONS.Spider1S = OPTIONS.Spider2S = OPTIONS.Spider;
	gameOverrides.FortyThieves = gameOverrides.Spider1S = gameOverrides.Spider2S = gameOverrides.Spider;

	OPTIONS.WillOTheWisp = OPTIONS.Spiderette = OPTIONS.Klondike1T = OPTIONS.Klondike;
	gameOverrides.WillOTheWisp = gameOverrides.Spiderette = gameOverrides.Klondike1T = gameOverrides.Klondike;

        OPTIONS.RussianSolitaire = OPTIONS.Yukon;

	Y.mix(Y.DD.DDM, {
		useHash: false, // :\
		_pg_activate: Solitaire.noop,
		_pg_size: function () {
			if (this.activeDrag) {
				this._pg.setStyles({width: "100%", height: "100%"});
			}
		}
	}, true);

	Y.DD.DDM.set("throttleTime", 40);
	Y.mix(Y.DD.Drop.prototype, {
		_activateShim: function () {
			var DDM = Y.DD.DDM;

			if (!DDM.activeDrag) { return false; }
			if (this.get("node") === DDM.activeDrag.get("node")) { return false; }
			if (this.get("lock")) { return false; }

			if (this.inGroup(DDM.activeDrag.get("groups"))) {
				DDM._addValid(this);
				this.overTarget = false;
				if (!this.get("useShim")) {
					this.shim = this.get("node");
				}
				this.sizeShim();
			} else {
				DDM._removeValid(this);
			}
		},

		_deactivateShim: function () {
			this.overTarget = false;
		}
	}, true);

	Solitaire.Statistics.winDisplay = function () {
		alert("You win!");
	};

	Solitaire.scale = Solitaire.noop;
	Solitaire.Card.ghost = false;
	Solitaire.Animation.animate = false;

	Solitaire.Card.base = {
		theme: "mobile",
		hiddenRankHeight: 3,
		rankHeight: 15,
		width: 40,
		height: 50
	};

	function fieldLayout(game, field, layout) {
		Y.mix(game[field].stackConfig.layout, layout, true);
	}

	function originalLayout(game, fields) {
		var layouts,
		    normalizeLayout = function (field) {
			return [field, Y.merge(BARE_LAYOUT, Solitaire[game][field].stackConfig.layout)];
		    };

		layouts = Y.Array.map(Y.Array(fields), normalizeLayout);

		return function () {
			var that = this;

			Y.each(layouts, function (layout) {
				Y.mix(that[layout[0]].stackConfig.layout, layout[1], true);
			});
		};
	}

	function runOverrides() {
		var game = Solitaire.name(),
		    override;

		if (gameOverrides.hasOwnProperty(game)) {
			override = optionWithOrientation(gameOverrides[game]);
			override.call(Solitaire.game);
		}
	}

	function optionWithOrientation(option) {
		var orientation = window.innerWidth === 480 ? LANDSCAPE : PORTRAIT,
		    o;

		if (!option.length) { return option; }

		o = option[orientation];
		return o ? o : option[LANDSCAPE];
			
	}

	function getOption(name) {
		var game = Solitaire.name(),
		    options = OPTIONS[game],
		    dfault = DEFAULTS[name],
		    option = options ? options[name] : dfault; 

		return optionWithOrientation(option ? option : dfault) || dfault;
	}
	
	function scale() {
		_scale.call(Solitaire.game, getOption("scale"));
	}

	function offsetLeft() {
		return getOption("offset");
	}

	function maxStackHeight() {
		return getOption("maxStackHeight");
	}

	function disableScroll(e) {
		var target = e.target;

		if (target.hasClass("stack") || target.hasClass("card")) { return; }
		e.preventDefault();
	}

	function disableStyles() {
		function stylesheet(index) {
			return {
				deleteSelector: function (selector) {
					var ss = document.styleSheets[index],
					    rules,
					    idx;

					if (!ss) { return; }

					rules = Array.prototype.splice.call(ss.rules, 0);
					idx = rules.indexOf(rules.filter(function (rule) {
						return rule.selectorText === selector;
					})[0]);

					if (idx !== -1) { ss.deleteRule(idx); }
				}
			};
		}

		stylesheet(0).deleteSelector("#menu li:hover");
	}

	function cancelIfBody(e) {
		if (e.target.test("#descriptions *")) { return; }
		e.preventDefault();
	}

	function setupUI() {
		var undo,
		    cancel,
		    showMenu,
		    menu,
		    body,
		    nav,
                    fb,
		    closeMenu = function () { menu.removeClass("show"); };

		disableStyles();

		menu = Y.one("#menu");
		body = Y.one("body");
		undo = Y.one("#undo");
                fb = Y.one("#social");
		nav = Y.Node.create("<nav id=navbar>");
		showMenu = Y.Node.create("<a id=show_menu class='button'>New Game</a>");
		cancel = Y.Node.create("<li class=cancel><a id='cancel'>Cancel</a></li>");

		undo.get("parentNode").remove();

		showMenu.on("click", function () {
			menu.addClass("show");
		});

		menu.append(cancel);

		nav.append(showMenu);
		if (fb) {
			navigator.onLine ? nav.append(fb) : fb.remove();
		}

		nav.append(undo.addClass("button"));

		body.append(nav);
		Y.on("click", closeMenu, ["#cancel", "#new_deal", "#restart"]);

		// GameChooser customizations
		Solitaire.Application.GameChooser.draggable = false;

		Y.one("#game-chooser .titlebar").append(document.createTextNode("Games"));
		Y.one("#game-chooser .close").append(document.createTextNode("Back"));

		Y.delegate("touchstart", function (e) {
			e.target.ancestor("li", true).addClass("hover");
		}, "#descriptions", "li");

		Y.delegate("touchend", function (e) {
			e.target.ancestor("li", true).removeClass("hover");
		}, "#descriptions", "li");

		Y.on("gamechooser:select", function (chooser) {
			chooser.choose();
			closeMenu();
		});

		Y.on("gamechooser:hide", function () {
			scrollToTop();
		});

		if (navigator.standalone) {
			body.addClass("fullscreen");
		}

		// set resize event to orientationchange to more flexibly customize the layout
		Solitaire.Application.resizeEvent = "orientationchange";
	}

	function setStyles(landscape) {
		var body = Y.one("body"),
		    from, to;

		if (landscape) {
			from = "portrait";
			to = "landscape";
		} else {
			from = "landscape";
			to = "portrait";
		}

		body.removeClass(from).addClass(to);
	}

	function setLayout() {
		var game = Solitaire.name(),
		    landscape = window.innerWidth === 480,
		    msh = maxStackHeight();

		setStyles(landscape);

		runOverrides();

		Solitaire.offset = {left: offsetLeft(), top: 10};
		Solitaire.maxStackHeight = function () { return msh; };
		scale();
	}

	function scrollToTop() {
		setTimeout(function () {scrollTo(0, 0);}, 10);
	}

	Y.on("beforeSetup", setLayout);
	Y.on("beforeResize", setLayout);
	Y.on("afterResize", scrollToTop);
        Y.on("load", scrollToTop);

	Y.on("touchstart", function (e) {
		if (e.target._node === document.body) { e.preventDefault(); }
	}, document);

	Y.on("touchmove", cancelIfBody, document);

	Y.on("domready", setupUI);
}, "0.0.1", {requires: ["solitaire", "statistics"]});
/*
 * Stack extension class to automatically move complete stacks/runs to the foundation
 */
YUI.add("auto-stack-clear", function (Y) {
	var Solitaire = Y.Solitaire;

	Y.namespace("Solitaire.AutoStackClear");

	Solitaire.AutoStackClear.register = function () {
		Y.on("solitaire|tableau:afterPush", function (stack) {
			isComplete(stack, clearComplete);
		});
	}

	function isComplete(stack, callback) {
		var cards = stack.cards,
		    rank,
		    suit,
		    card,
		    complete,
		    i;

		if (!cards.length) { return false; }

		for (i = cards.length - 1, rank = 1, suit = cards[i].suit; i >= 0 && rank < 14; i--, rank++) {
			card = cards[i];

			if (card.isFaceDown || card.rank !== rank || card.suit !== suit) {
				return false;
			}
		}

		complete = rank === 14;
		complete && typeof callback === "function" && callback(stack, i + 1);
		return complete;
	}

	function clearComplete(stack, startIndex) {
		var foundation,
		    cards = stack.cards,
		    count = cards.length - startIndex;

		// find the first empty foundation
		foundation = Y.Array.find(Solitaire.game.foundation.stacks, function (stack) {
			return !stack.cards.length;
		});

		Solitaire.stationary(function () {
			while (count) {
				cards.last().moveTo(foundation);
				count--;
			}

		});

		stack.updateCardsPosition();
	}
}, "0.0.1", {requires: ["solitaire"]});
/*
 * automatically turn over the first open faceup card in a stack
 */
YUI.add("auto-turnover", function (Y) {
	Y.on("tableau:afterPop", function (stack) {
		Y.Array.each(stack.cards, function (card) {
			if (card && card.isFaceDown && card.isFree()) {
				card.faceUp();
			}
		});
	});
}, "0.0.1", {requires: ["solitaire"]});
YUI.add("solitaire-autoplay", function (Y) {
	Y.namespace("Solitaire.Autoplay");

	var Solitaire = Y.Solitaire,
	    Autoplay = Solitaire.Autoplay,
	    whenWon = true,
	    autoPlayInterval = null,
	    autoPlayable = ["Klondike", "Klondike1T", "FortyThieves", "GClock", "Freecell", "FlowerGarden", "Yukon"];

	Y.on("endTurn", function () {
		if (!whenWon || autoPlayable.indexOf(Solitaire.game.name()) === -1) { return; }

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
		var played = false;

		Solitaire.game.eachStack(function (stack) {
			var field = stack.field;

			if (played || field === "foundation" || field === "deck") { return; }

			played = !stack.eachCard(function (card) {
				return !card.autoPlay();
			});
		});
	}

	function isEffectivelyWon() {
		var stop = false;

		Solitaire.game.eachStack(function (stack) {
			var field = stack.field,
			    prevRank = 14,
			    decending;

			if (stop || field !== "tableau" && field !== "waste") { return; }

			decending = stack.eachCard(function (card) {
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
		}
	});
}, "0.0.1", {requires: ["solitaire"]});
YUI.add("solitaire-background-fix", function (Y) {
	var _body;

	Y.on("load", resize);
	Y.on("resize", resize);

	function resize() {
		var width = body().get("winWidth"),
		    height = body().get("winHeight"),
		    style = document.body.style;

		if (!Y.UA.mobile) {
			body().setStyles({width: width, height: height});
		}

		/*
		 * if we don't support the background-size property, use the tiled background instead
		 */

		if (style.backgroundSize === undefined && style.MozBackgroundSize === undefined) {
			body().setStyles({
				backgroundImage: "url(greentiled.jpg)",
				backgroundRepeat: "repeat"
			});
		}
	}

	function body() {
		if (!_body) {
			_body = new Y.Node(document.body);
		}

		return _body;
	}
}, "0.0.1", {requires: ["solitaire"]});
/*
 * record win/lose records, streaks, etc
 */
YUI.add("statistics", function (Y) {
	var loaded,
	    won,
	    enabled = true,
	    localStorage = window.localStorage,
	    Solitaire = Y.Solitaire,
	    Statistics = Y.namespace("Solitaire.Statistics");

	if (!localStorage) { return; }

	Y.on("newGame", function () {
		if (loaded) { recordLose(); }

		won = false;
		loaded = null;
	});

	Y.on("loadGame", function () {
		loaded = Solitaire.game.name();
		saveProgress();
		won = false;
	});

	Y.on("endTurn", function () {
		if (!loaded) {
			loaded = Solitaire.game.name();
			saveProgress();
		}
	});

	Y.on("win", function () {
		if (won || !enabled) { return; }

		var winDisplayDelay = 1000;
		loaded = null;
		won = true;

		recordWin();

		explodeFoundations();
	});

	Y.on("beforeSetup", function () {
		var winDisplay = Y.one("#win_display");

		winDisplay && winDisplay.remove();
		Statistics.enable();
	});

	function explodeFoundations() {
		var delay = 500,
		    duration = 900,
		    interval = 900;

		Game.eachStack(function (stack) {
			stack.eachCard(function (card) {
				if (!card) { return; }

				var node = card.node;
				if (card !== stack.last()) {
					node.addClass("hidden");
					return;
				}

				node.plug(Y.Breakout, {columns: 5});
				(function (node) {
					setTimeout(function () {
						node.breakout.explode({random: 0.65, duration: duration});
					}, delay);
				})(node);

				delay += interval;
			});
		}, "foundation");

		setTimeout(function () {
			Statistics.winDisplay();
		}, delay + 200);
	}

	/*
	 * TODO: a templating system might make this less grody
	 */
	function winDisplay() {
		var nameMap = {
			Agnes: "Agnes",
			Klondike: "Klondike",
			Klondike1T: "Klondike (Vegas style)",
			FlowerGarden: "Flower Garden",
			FortyThieves: "Forty Thieves",
			Freecell: "Freecell",
                        Golf: "Golf",
			GClock: "Grandfather's Clock",
			MonteCarlo: "Monte Carlo",
			Pyramid: "Pyramid",
			RussianSolitaire: "Russian Solitaire",
			Scorpion: "Scorpion",
			Spider: "Spider",
			Spider1S: "Spider (1 Suit)",
			Spider2S: "Spider (2 Suit)",
                        Spiderette: "Spiderette",
                        WillOTheWisp: "Will O' The Wisp",
			TriTowers: "Tri Towers",
			Yukon: "Yukon"},
		    
		    stats = Record(localStorage[Solitaire.game.name() + "record"]),

		    streakCount, winCount, loseCount,

		    output = "<div id='win_display'>";

		streakCount = stats.streaks().last().length;
		winCount = stats.wins().length;
		loseCount = stats.loses().length;


		output += "<p>You win! You're awesome.</p>";
		output += "<h2>" + nameMap[Solitaire.game.name()] + " stats:</h2>";
		output += "<ul>";
		output += "<li>Current win streak: <span class='streak'>" + streakCount + "</li>";
		output += "<li>Total wins: <span class='wins'>" + winCount + "</li>";
		output += "<li>Total loses: <span class='loses'>" + loseCount + "</li>";
		output += "<div class=replay_options><button class=new_deal>New Deal</button><button class=choose_game>Choose Game</button></div>";

		output += "</ul></div>";

		return output;
	}

	function record(value) {
		var key = localStorage["currentGame"] + "record",
		    record = localStorage[key] || "";

		record += new Date().getTime() + "_" + value + "|";

		localStorage[key] = record;
	}

	function recordLose() {
		record(0);

		clearProgress();
	}

	function recordWin() {
		record(1);

		clearProgress();
	}

	function clearProgress() {
		localStorage.removeItem("currentGame");
	}

	function saveProgress() {
		localStorage["currentGame"] = Solitaire.game.name();
	}

	function Record(raw) {
		function parse() {
			var entries = raw.split("|");

			entries.splice(entries.length - 1);

			return Y.Array.map(entries, function (entry) {
				entry = entry.split("_");

				return {date: new Date(entry[0]), won: !!parseInt(entry[1], 10)};
			});
		}

		function won(entry) {
			return entry.won;
		}

		var record = parse();

		return {
			streaks: function () {
				var streaks = [],
				    streak = null;

				Y.Array.each(record, function (entry) {
					if (!entry.won) {
						streak && streaks.push(streak);
						streak = null;
					} else {
						if (!streak) { streak = []; }
						streak.push(entry);
					}
				});

				streak && streaks.push(streak);

				return streaks;
			},

			wins: function () {
				return Y.Array.filter(record, won);
			},

			loses: function () {
				return Y.Array.reject(record, won);
			}
		};
	}

	Y.mix(Statistics, {
		winDisplay: function () {
			var Application = Solitaire.Application;

			Y.one("body").append(winDisplay());

			Y.on("click", function () {
				Application.newGame();
			}, Y.one("#win_display .new_deal"));

			Y.on("click", function () {
				Application.GameChooser.show(true);
			}, Y.one("#win_display .choose_game"));

		},

		enable: function () {
			enabled = true;
		},

		disable: function () {
			enabled = false;
		}
	});

}, "0.0.1", {requires: ["solitaire", "array-extras", "breakout"]});
/*
 * Automatically solve a game of Freecell
 */
YUI.add("solver-freecell", function (Y) {
	Y.namespace("Solitaire.Solver.Freecell");

	// only let this work with web workers and typed arrays

	if (!(window.Worker && window.ArrayBuffer && window.Uint8Array)) { return; }

	var Solitaire = Y.Solitaire,
	    FreecellSolver = Solitaire.Solver.Freecell,
	    suitTable = {
		s: 0,
		h: 1,
		c: 2,
		d: 3
	    };

	function cardToValue(card) {
		return card ? card.rank << 2 | suitTable[card.suit] : 0;
	}

	function cardRank(val) {
		return val >> 2;
	}

	function cardSuit(val) {
		return ["s", "h", "c", "d"][val & 3];
	}

	function compareStack(a, b) {
		return b[0] - a[0];
	}

	function sortedStacks(field) {
		return Y.Array.map(field.stacks, function (s) { return s; }).
			sort(function (s1, s2) {
				var c1 = s1.first(),
				    c2 = s2.first();

				return cardToValue(c1) - cardToValue(c2);
			});
	}

	function gameToState(game) {
		var reserve, foundation, tableau;

		tableau = Y.Array.map(sortedStacks(game.tableau), function (s) {
			var buffer = [];

			s.eachCard(function (c, i) {
				buffer[i] = cardToValue(c);
			});

			return [buffer, s.cards.length];
		});

		reserve = [];
		Y.Array.forEach(sortedStacks(game.reserve), function (s, i) {
			reserve[i] = cardToValue(s.last());
		});

		foundation = [];
		Y.Array.forEach(sortedStacks(game.foundation), function (s, i) {
			foundation[i] = cardToValue(s.last());
		});

		return {reserve: reserve, foundation: foundation, tableau: tableau};
	}


	function moveToCardAndStack(game, move) {
		var source = move.source,
		    dest = move.dest,
		    value,
		    ret = {};

		value = source[1];
		game.eachStack(function (stack) {
			if (ret.card) { return; }

			var card = stack.last();
			if (!card) { return; }

			if (card.rank === cardRank(value) &&
			    card.suit === cardSuit(value)) {
				ret.card = card;
			}
		}, source[0]);

		value = dest[1];
		game.eachStack(function (stack) {
			if (ret.stack) { return; }

			var card = stack.last();

			if (!(card || value)) { ret.stack = stack; }

			if (card &&
			    (card.rank === cardRank(value) &&
			    card.suit === cardSuit(value))) {
				ret.stack = stack;
			}
		}, dest[0]);

		return ret;
	}

	function withSelector(selector, callback) {
		var node = Y.one(selector);

		if (node) {
			callback(node);
		}
	}

	var Animation = {
		interval: 500,
		timer: null,
		remainingMoves: null,

		init: function (moves) {
			var current = moves;

			while (current) {
				if (current.next) {
					current.next.prev = current;
				}
				current = current.next;
			}

			this.remainingMoves = moves;
		},

		pause: function () {
			Solitaire.Autoplay.enable();

			window.clearTimeout(this.timer);
			this.timer = null;

			withSelector("#solver_bar .pause", function (node) {
				node.removeClass("pause");
				node.addClass("play");
			});
		},

		playCurrent: function (game) {
			var move,
			    card, origin;

			if (!this.remainingMoves) { return; }

			move = moveToCardAndStack(game, this.remainingMoves);
			card = move.card;

			if (!card) { return; }

			origin = card.stack;

			card.after(function () {
				origin.updateCardsPosition();
				move.stack.updateCardsPosition();
			});
			card.moveTo(move.stack);
		},

		prev: function (game) {
			var prev = this.remainingMoves.prev;

			if (prev) {
				Y.fire("undo", true);
				this.remainingMoves = prev;
			}
		},

		next: function (game) {
			var current = this.remainingMoves,
			    next = this.remainingMoves.next;

			Solitaire.Statistics.disable();
			this.playCurrent(game);

			if (next) {
				this.remainingMoves = next;
			}

			Y.fire("endTurn", true);
		},

		play: function (game) {
			var move,
			    card, origin;

			if (!this.remainingMoves) { return; }

			Solitaire.Autoplay.disable();

			withSelector("#solver_bar .play", function (node) {
				node.removeClass("play");
				node.addClass("pause");
			});

			this.next(game);
			this.timer = window.setTimeout(function () {
				this.play(game);
			}.bind(this), this.interval);
		}
	};

	var Status = {
		bar: null,
		indicator: null,
		indicatorTimer: null,
		indicatorInterval: 750,
		delay: 400,

		updateIndicator: function (ticks) {
			var indicator = this.indicator,
			    i,
			    text;

			if (!indicator) { return; }

			ticks = ((ticks || 0) % 4);
			text = "Solving";
			for (i = 0; i < ticks; i++) {
				text += ".";
			}

			indicator.set("text", text);

			this.indicatorTimer = window.setTimeout(this.updateIndicator.partial(ticks + 1).bind(this), this.indicatorInterval);
		},

		stopIndicator: function (solved) {
			var indicator = this.indicator;

			window.clearTimeout(this.indicatorTimer);
			if (!indicator) { return; }

			if (solved) {
				indicator.set("text", "Solution found");
				withSelector("#solver_bar .controls", function (node) {
					node.removeClass("hidden");
				});

			} else {
				indicator.set("text", "Unable to find solution");
			}

			this.indicatorTimer = null;
		},

		show: function () {
			if (Y.one("#solver_bar")) { return; }

			var bar = Y.Node.create("<div id=solver_bar></div>"),
			    indicator = Y.Node.create("<span class=indicator>"),
			    next = Y.Node.create("<div class=fastforward>"),
			    prev = Y.Node.create("<div class=rewind>"),
			    playPause = Y.Node.create("<div class=play>"),
			    controls = Y.Node.create("<div class='controls hidden'>"),
			    playCallback;

			next.on("click", function () {
				Animation.next(Game);
			});
			prev.on("click", function () {
				Animation.prev(Game);
			});
			playPause.on("click", function () {
				/*
				 * Here I tie up state with the DOM
				 * Maybe thats alright, as its interface state being stored in the interface
				 */

				if (this.hasClass("play")) {
					Animation.play(Game);
				} else if (this.hasClass("pause")) {
					Animation.pause();
				}
			});

			controls.append(prev);
			controls.append(playPause);
			controls.append(next);

			bar.append(indicator);
			bar.append(controls);
			Y.one("body").append(bar);

			this.indicator = indicator;

			this.bar = bar;
		},

		hide: function () {
			if (this.bar) {
				this.bar.remove();
			}
		}
	};

	Y.mix(FreecellSolver, {
		currentSolution: null,
		worker: null,
		attached: false,
		supportedGames: ["Freecell"],

		isSupported: function () {
			return this.supportedGames.indexOf(Game.name()) !== -1;
		},

		enable: function () {
			if (this.isSupported()) {
				this.createUI();
			}
			this.attachEvents();
		},

		disable: function () {
			if (this.worker) {
				this.worker.terminate();
			}

			Status.hide();
		},

		attachEvents: function () {
			if (this.attached) { return; }

			var pause = Animation.pause.bind(Animation);

			// start the solver if the current game supports it
			Y.on("afterSetup", function () {
				if (this.isSupported()) {
					this.solve();
				} else {
					this.disable();
				}
			}.bind(this));

			// if a solution isn't currently being played, find a new solution on every new turn
			Y.on("endTurn", function (dontResolve) {
				if (dontResolve || !this.isSupported()) { return; }
				this.solve();
			}.bind(this));

			Y.on("autoPlay", function () {
				FreecellSolver.disable();
			});

			Y.on("win", function () {
				FreecellSolver.disable();
			});

			// human interaction stops playing the current solution
			document.documentElement.addEventListener("mousedown", function (e) {
				if (e.target.className.match(/\bpause\b/)) { return; }
				pause();
			}, true);

			this.attached = true;
		},

		createUI: function () {
			Status.show();
		},

		stop: function () {
			if (this.worker) {
				this.worker.terminate();
			}
		},

		solve: function () {
			this.stop();

			withSelector("#solver_bar .controls", function (node) {
				node.addClass("hidden");
			});

			this.currentSolution = null;
			this.worker = new Worker("js/solver-freecell-worker.js");
			this.worker.onmessage = function (e) {
				var solution = this.currentSolution = e.data.solution;

				Animation.init(solution);
				if (solution) {
					Status.stopIndicator(true);
				} else {
					Status.stopIndicator(false);
				}
			}.bind(this);

			this.worker.postMessage({action: "solve", param: gameToState(Game)});

			window.clearTimeout(Status.indicatorTimer);
			Status.indicatorTimer = window.setTimeout(Status.updateIndicator.bind(Status), Status.delay);
		}
	});

	Y.on("beforeSetup", FreecellSolver.enable.bind(FreecellSolver));
}, "0.0.1", {requires: ["solitaire"]});
var attempts = 0,
    maxFastAttempts = 150000;

function GameState(obj) {
	if (!obj) { return; }
	var i, stack;

	this.reserve = new Uint8Array(obj.reserve);
	this.foundation = new Uint8Array(obj.foundation);
	this.tableau = [];

	for (i = 0; i < obj.tableau.length; i++) {
		stack = obj.tableau[i];
		this.tableau[i] = [new Uint8Array(stack[0]), stack[1]];
	}
}

GameState.fromState = function (other) {
	var state = new GameState();

	state.tableau = other.tableau;
	state.reserve = other.reserve;
	state.foundation = other.foundation;

	return state;
}

GameState.prototype = {
	reserve: null,
	foundation: null,
	tableau: null,
	rating: null,
	parentMove: null,
	parent: null,
	child: null,

	solved: function () {
		var i, len,
		    foundation = this.foundation;

		for (i = 0, len = 4; i < len; i++) {
			if ((foundation[i] >> 2) !== 13) { return false; }
		}

		return true;
	},

	eachTableau: function (callback) {
		var i, len,
		    stack,
		    tableau = this.tableau;

		for (i = 0, len = tableau.length; i < len; i++) {
			stack = tableau[i];
			callback.call(this, stack[0], stack[1], i);
		}
	},

	validTarget: function (field, value, start) {
		var rank = value >> 2,
		    suit = value & 3,
		    dest,
		    tableau,
		    i, len;
	
		if (!value) { return -1; }

		if (start === undefined) {
			start = 0;
		} else {
			start++;
		}

		switch (field) {
		case "foundation":
			for (i = 0; i < 4; i++ ) {
				dest = this.foundation[i];

				if ((!dest && rank === 1) ||
				    (suit === (dest & 3) &&
				    rank === (dest >> 2) + 1)) {
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

				if (!tableau[i][1] ||
				    (((suit & 1) ^ (dest & 1)) &&
				    (rank === (dest >> 2) - 1))) {
					return i;
				}
			}
			break;
		}

		return -1;
	},

	move: function (sourceField, sourceStack, destField, destStack) {
		var val = this.pop(sourceField, sourceStack);
		this.push(destField, destStack, val);
	},

	pop: function (field, stack) {
		var val,
		    newBuffer,
		    bufferLength,
		    tableau,
		    i, len;

		if (field === "reserve" || field === "foundation") {
			val = this[field][stack];

			this[field] = new Uint8Array(this[field]);
			this[field][stack] = 0;
			return val;
		}

		tableau = this.tableau;
		bufferLength = tableau[stack][1];

		if (!bufferLength) { return 0; }

		val = tableau[stack][0][bufferLength - 1];
		this.copyTableau(stack, bufferLength - 1);
		return val;
	},

	push: function (field, stack, val) {
		var newLength;
		if (!val) { return; }

		if (field === "reserve" || field === "foundation") {
			this[field] = new Uint8Array(this[field]);
			this[field][stack] = val;
			return;
		}

		newLength = this.tableau[stack][1] + 1;
		this.copyTableau(stack, newLength);
		this.tableau[stack][0][newLength - 1] = val;

	},

	copyTableau: function (stack, newLength) {
		var old = this.tableau,
		    tableau = old[stack][0],
		    newBuffer = new Uint8Array(new ArrayBuffer(newLength)),
		    i, len;

		for (i = 0; i < newLength; ++i) {
			newBuffer[i] = tableau[i];
		}

		this.tableau = [];

		for (i = 0, len = old.length; i < len; ++i) {
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
		if (this._serialized !== null) { return this._serialized; }

		var i, j, len, stack;

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
		var RATING_FOUNDATION = 1000,
		    RATING_CLOSEDTABLEAUFOLLOWUP = 20,
		    RATING_FREEFOUNDATIONTARGET = 15,
		    RATING_OPENTABLEAU = 15,
		    RATING_FREETABLEAUTARGET = 10,
		    RATING_OPENRESERVE = 10,
		    RATING_TABLEAU = 2,
		    RATING_RESERVE = -1,
		    RATING_BURYFOUNDATIONTARGET = -5,
		    RATING_CLOSEDTABLEAU = -10,
		rating = 0,
		stack,
		card,
		nextCard,
		followup = false,
		i, length;

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
					rating += RATING_FREEFOUNDATIONTARGET - (length - 2 - i) + (13 - (stack[0][i] >> 2));
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
				if (sourceField === "tableau" && this.tableau[sourceIndex][1] === 1) {
					return -1000;
				}

				// reward a move to an empty stack that can be followed up be another move
				for (i = 0; i < 4; i++) {
					nextCard = this.reserve[i];
					if (((nextCard >> 2) === (card >> 2) - 1) &&
					    ((nextCard & 1) ^ (card & 1))) {
						rating += RATING_CLOSEDTABLEAUFOLLOWUP + (nextCard >> 2);
						followup = true;
					}
				}

				for (i = 0; i < 8; i++) {
					stack = this.tableau[i];
					nextCard = stack[0][stack[1] - 1];
					if (((nextCard >> 2) === (card >> 2) - 1) &&
					    ((nextCard & 1) ^ (card & 1))) {
						rating += RATING_CLOSEDTABLEAUFOLLOWUP + (nextCard >> 2);
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
		var move = this.parentMove,
		    parent = this.parent;

		if (!(move && parent)) { return; }

		move.source[1] = parent.lastCard(move.source[0], move.source[1]);
		move.dest[1] = parent.lastCard(move.dest[0], move.dest[1]);
	},

	lastCard: function (field, index) {
		var stack, length;

		switch (field) {
		case "reserve":
		case "foundation":
			return this[field][index];

		case "tableau":
			stack = this[field][index];
			length = stack[1];

			return stack[0][length - 1];
		}
	},

	becomeChild: function () {
		var parent = this.parent;

		if (!parent) { return; }

		parent.child = this;
		this.transformParentMove();
	}
};

// returns the depth of tree to jump up to, or 0 if the solution is found
function solve(state, depth, visited, movesSinceFoundation, fastSearch) {
	var jumpDepth,
	    maxDepth = 200,
	    sourceIndex, destIndex, length, val,
	    next, sourceField, destField,
	    tableau,
	    move, moves = [],
	    scale = 1,
	    foundFoundation = false,
	    i;

	/*
	 * if the state is the solved board, return
	 * for each reserve and tableau stack, find all valid moves
	 * for each valid move, create a new game state
	 * sort each state by rank, add for each thats undiscoverd, and it as a branch and recurse
	 * stop iterating if a child state is solved
	 */

	if (depth > maxDepth) { return maxDepth; }

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

		if (!val) { continue; }

		destIndex = state.validTarget("foundation", val);
		if (destIndex > -1) {
			moves.push({source: ["reserve", i], dest: ["foundation", destIndex]});
			foundFoundation = true;
		}

		if (foundFoundation) { break; }

		destIndex = 0;
		while ((destIndex = state.validTarget("tableau", val, destIndex)) > -1) {
			moves.push({source: ["reserve", i], dest: ["tableau", destIndex]});
		}
	}

	// find moves from the tableau
	tableau = state.tableau;
	for (i = 0; i < tableau.length; i++) {
		s = tableau[i][0];
		length = tableau[i][1];
		val = s[length - 1];

		if (!val) { continue; }

		destIndex = state.validTarget("foundation", val);
		if (destIndex > -1) {
			moves.push({source: ["tableau", i], dest: ["foundation", destIndex]});
			foundFoundation = true;
		}

		if (foundFoundation) { break; }

		destIndex = state.validTarget("reserve", val);
		if (destIndex > -1) {
			moves.push({source: ["tableau", i], dest: ["reserve", destIndex]});
		}

		destIndex = 0;
		while ((destIndex = state.validTarget("tableau", val, destIndex)) > -1) {
			moves.push({source: ["tableau", i], dest: ["tableau", destIndex]});
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

		next.rating = next.rateMove(sourceField, sourceIndex, destField, destIndex);
		next.move(sourceField, sourceIndex, destField, destIndex);
		next.parentMove = move;
		next.parent = state;

		moves[i] = next;
	};

	moves.sort(function (a, b) {
		return b.rating - a.rating;
	});

	// if nothing's been moved to the foundation in many turns, backtrack alot of steps
	if (movesSinceFoundation >= 20) {
		scale = 0.7;
	}

	if (fastSearch && (++attempts > maxFastAttempts)) {
		scale = 0.001;
	}

	for (i = 0; i < moves.length && scale === 1; i++) {
		move = moves[i];
		if (jumpDepth < depth) { break; }
		if (visited[move.serialize()]) {
			if (fastSearch) { break } else { continue };
		}

		visited[move.serialize()] = true;
		jumpDepth = solve(move, depth + 1, visited, movesSinceFoundation, fastSearch);
	}

	if (jumpDepth === 0) {
		state.becomeChild();
	}

	if (jumpDepth === undefined) { jumpDepth = Math.ceil(depth * scale); }
	return jumpDepth;
}

function mapMoves(state) {
	var child = state.child,
	    moves = null,
	    current;

	if (!child) { return; }

	moves = current = child.parentMove;

	while (child = child.child) {
		current.next = child.parentMove;
		current = current.next;
	}

	return moves;
}

function attemptSolution(obj, fastSearch) {
	var state = new GameState(obj);

	attempts = 0;
	solve(state, 1, {}, 0, fastSearch);
	return mapMoves(state);
}

onmessage = function (e) {
	var state,
	    solution,
	    data = e.data;


	if (data.action === "solve") {
		solution = attemptSolution(data.param, true);

		if (!solution) {
			solution = attemptSolution(data.param, false);
		}
		self.postMessage({solution: solution});
	}
};
YUI.add("agnes", function (Y) {
	function inSeries(first, second) {
		return (first + 1) % 13 === second % 13;
	}

	function seedRank() {
		return Agnes.foundation.stacks[0].first().rank;
	};

	var Solitaire = Y.Solitaire,
	    Klondike = Solitaire.Klondike,
	    Agnes = Solitaire.Agnes = instance(Klondike, {
		fields: ["Foundation", "Deck", "Waste", "Tableau", "Reserve"],

		height: function () { return this.Card.base.height * 5.6; },
		maxStackHeight: function () { return this.Card.height * 4.3; },

		deal: function () {
			var deck = this.deck.stacks[0],
			    foundation = this.foundation.stacks[0];

			Klondike.deal.call(this);

			deck.last().faceUp().moveTo(foundation);

			this.turnOver();
		},

		redeal: Solitaire.noop,

		turnOver: function () {
			var deck = this.deck.stacks[0],
			    reserves = this.reserve.stacks,
			    waste = this.waste.stacks,
			    count,
			    target,
			    i;

			if (deck.cards.length < 7) {
				count = 2;
				target = waste;
			} else {
				count = 7;
				target = reserves;
			}

			for (i = 0; i < count; i++) {
				deck.last().faceUp().moveTo(target[i]);
			}
		},

		Waste: instance(Klondike.Waste, {
			stackConfig: {
				total: 2,
				layout: {
					hspacing: 1.5,
					top: 0,
					left: 0
				}
			},

			Stack: instance(Solitaire.Stack, {
				setCardPosition: function (card) {
					var last = this.last(),
					    top = this.top,
					    left = last ? last.left + Solitaire.Card.width * 1.5 : this.left;

					card.top = top;
					card.left = left;
				}
			})
		}),

		Reserve: {
			field: "reserve",
			stackConfig: {
				total: 7,
				layout: {
					hspacing: 1.25,
					left: 0,
					top: function () { return Solitaire.Card.height * 4.4; }
				}
			},

			Stack: instance(Klondike.Stack, {
				images: {},
				
				setCardPosition: function (card) {
					var last = this.last(),
					    top = last ? last.top + last.rankHeight : this.top,
					    left = this.left;
					    
					card.top = top;
					card.left = left;
				}
			})
		},

	        Card: instance(Klondike.Card, {
			playable: function () {
				if (this.stack.field === "reserve") {
					return this.isFree();
				} else {
					return Klondike.Card.playable.call(this);
				}
			},

			validTarget: function (stack) {
				var target = stack.last();

				switch (stack.field) {
				case "tableau":
					if (!target) {
						return inSeries(this.rank, seedRank());
					} else {
						return !target.isFaceDown && target.color !== this.color && inSeries(this.rank, target.rank);
					}
				case "foundation":
					return this.validFoundationTarget(target);
				default:
					return false;
				}
			},

			validFoundationTarget: function (target) {
				if (!target) {
					return this.rank === seedRank();
				} else {
					return this.suit === target.suit &&
					       this.rank % 13 === (target.rank + 1) % 13;
				}
			}
		})
	    });
}, "0.0.1", {requires: ["klondike"]});
YUI.add("golf", function (Y) {
	var Solitaire = Y.Solitaire,
	Golf = Y.Solitaire.Golf = instance(Solitaire, {
		fields: ["Deck", "Foundation", "Tableau"],

		deal: function () {
			var card,
			    stack,
			    stacks = this.tableau.stacks,
			    deck = this.deck,
			    foundation = this.foundation.stacks[0],
			    row;


			for (row = 0; row < 5; row++) {
				for (stack = 0; stack < 7; stack++) {
					card = deck.pop().faceUp();
					stacks[stack].push(card);
				}
			}

			card = deck.pop().faceUp();
			foundation.push(card);

			deck.createStack();
		},

		turnOver: function () {
			var deck = this.deck.stacks[0],
			    foundation = this.foundation.stacks[0],
			    last = deck.last();

			last && last.faceUp().moveTo(foundation);
		},

		isWon: function () {
			var won = true;

			this.eachStack(function (stack) {
				stack.eachCard(function (card) {
					if (card) { won = false; }

					return won;
				});
			}, "tableau");

			return won;
		},

		height: function () { return this.Card.base.height * 4; },

		Deck: instance(Solitaire.Deck, {
			field: "deck",
			stackConfig: {
				total: 1,
				layout: {
					hspacing: 0,
					top: function () { return Solitaire.Card.height * 3; },
					left: 0
				}
			},

			createStack: function () {
				var i, len;

				for (i = 0, len = this.cards.length; i < len; i++) {
					this.stacks[0].push(this.cards[i]);
				}
			}
		}),

		Tableau: {
			field: "tableau",
			stackConfig: {
				total: 7,
				layout: {
					hspacing: 1.25,
					top: 0,
					left: 0
				}
			}
		},

		Foundation: {
			field: "foundation",
			stackConfig: {
				total: 1,
				layout: {
					hspacing: 0,
					top: function () { return Solitaire.Card.height * 3; },
					left: function () { return Solitaire.Card.width * 3.75; }
				}
			}
		},

		Events: instance(Solitaire.Events, {
			dragCheck: function (e) {
				this.getCard().autoPlay();

				/* workaround because YUI retains stale drag information if we halt the event :\ */
				this._afterDragEnd();
				e.halt();
			}
		}),

		Card: instance(Solitaire.Card, {
			/*
			 * return true if the target is 1 rank away from the this card
			 */
			validTarget: function (stack) {
				if (stack.field !== "foundation") { return false; }

				var target = stack.last(),
				    diff = Math.abs(this.rank - target.rank);

				return diff === 1;
			},

			isFree: function () {
				return !this.isFaceDown && this === this.stack.last();
			},
		}),
		     
		Stack: instance(Solitaire.Stack, {
			images: {}
		})
	}, true);

	Y.Array.each(Golf.fields, function (field) {
		Golf[field].Stack = instance(Golf.Stack);
	});

	Y.mix(Golf.Tableau.Stack, {

		setCardPosition: function (card) {
			var last = this.cards.last(),
			    top = last ? last.top + last.rankHeight : this.top,
			    left = this.left;

			card.left = left;
			card.top = top;
		}
	}, true);

	Y.mix(Golf.Deck.Stack, {
		setCardPosition: function (card) {
			var last = this.last(),
			    top,
			    left,
			    zIndex;

			top = this.top;
			if (last) {
				left = last.left + card.width * 0.1;
				zIndex = last.zIndex + 1;
			} else {
				left = this.left;
				zIndex = 0;
			}

			card.top = top;
			card.left = left;
			card.zIndex = zIndex;
		}
	}, true);
}, "0.0.1", {requires: ["solitaire"]});
YUI.add("klondike", function (Y) {

var Solitaire = Y.Solitaire,
    Klondike = Y.Solitaire.Klondike = instance(Solitaire, {
	fields: ["Foundation", "Deck", "Waste", "Tableau"],

	deal: function () {
		var card,
		    piles = 6,
		    stack = 0,
		    deck = this.deck,
		    stacks = this.tableau.stacks;

		while (piles >= 0) {
			card = deck.pop().faceUp();
			stacks[6 - piles].push(card);

			for (stack = 7 - piles; stack < 7; stack++) {
				card = deck.pop();
				stacks[stack].push(card);			
			}
			piles--;
		}

		deck.createStack();
	},

	turnOver: function () {
		var deck = this.deck.stacks[0],
		    waste = this.waste.stacks[0],
		    updatePosition = Klondike.Card.updatePosition,
		    last,
		    i, stop;

		Klondike.Card.updatePosition = Solitaire.noop;

		for (i = deck.cards.length, stop = i - 3; i > stop && i; i--) {
			deck.last().faceUp().moveTo(waste);
		}

		Klondike.Card.updatePosition = updatePosition;

		waste.eachCard(function (c) {
			c.updatePosition();
		});
	},

	redeal: function () {
		var deck = this.deck.stacks[0],
		    waste = this.waste.stacks[0];

		while (waste.cards.length) {
			waste.last().faceDown().moveTo(deck);
		}
	},

	Stack: instance(Solitaire.Stack),

	Foundation: {
		stackConfig: {
			total: 4,
			layout: {
				hspacing: 1.25,
				top: 0,
				left: function () { return Solitaire.Card.width * 3.75; }
			}
		},
		field: "foundation",
	},

	Deck: instance(Solitaire.Deck, {
		stackConfig: {
			total: 1,
			layout: {
				hspacing: 0,
				top: 0,
				left: 0
			}
		},
		field: "deck"
	}),

	Waste: {
		stackConfig: {
			total: 1,
			layout: {
				hspacing: 0,
				top: 0,
				left: function () { return Solitaire.Card.width * 1.5; }
			}
		},
		field: "waste",
	},

	Tableau: {
		stackConfig: {
			total: 7,
			layout: {
				hspacing: 1.25,
				top: function () { return Solitaire.Card.height * 1.5; },
				left: 0
			}
		},
		field: "tableau",
	},

	Card: instance(Solitaire.Card, {
		playable: function () {

			switch (this.stack.field) {
			case "tableau":
				return !this.isFaceDown;
			case "foundation":
				return false;
			case "waste":
				return this.isFree();
			case "deck":
				return true;
			}
		},

		validFoundationTarget: function (target) {
			if (!target) {
				return this.rank === 1;
			} else {
				return target.suit === this.suit && target.rank === this.rank - 1;
			}
		},

		validTarget: function (stack) {
			var target = stack.last();

			switch (stack.field) {
			case "tableau":
				if (!target) {
					return this.rank === 13;
				} else {
					return !target.isFaceDown && target.color !== this.color && target.rank === this.rank + 1;
				}
			case "foundation":
				return this.validFoundationTarget(target);
			default:
				return false;
			}
		}
	})
});

Y.Array.each(Klondike.fields, function (field) {
	Klondike[field].Stack = instance(Klondike.Stack);
});


Y.mix(Klondike.Stack, {
	validTarget: function (stack) {
		return stack.field === "tableau" &&
		    this.first().validTarget(stack);
	}
}, true);

Y.mix(Klondike.Tableau.Stack, {
	setCardPosition: function (card) {
		var last = this.cards.last(),
		    top = last ? last.top + last.rankHeight : this.top,
		    left = this.left;

		card.left = left;
		card.top = top;
	}
}, true);

Y.mix(Klondike.Waste.Stack, {
	// always display only the last three cards
	setCardPosition: function (card) {
		var cards = this.cards,
		    last = cards.last(),
		    stack = this;

		Y.Array.each(cards.slice(-2), function (card, i) {
			card.left = stack.left;
			card.top = stack.top;
		});

		if (!cards.length) {
			card.left = stack.left;
		}

		if (cards.length === 1) {
			card.left = stack.left + 0.2 * card.width;
		} else if (cards.length > 1) {
			last.left = stack.left + 0.2 * card.width;
			last.top = stack.top;
			card.left = stack.left + 0.4 * card.width;
		}

		card.top = stack.top;
	}
}, true);

Y.mix(Klondike.Deck.Stack, {
	createNode: function () {
		Solitaire.Stack.createNode.call(this);
		this.node.on("click", Solitaire.Events.clickEmptyDeck);
		this.node.addClass("playable");
	}
}, true);


}, "0.0.1", {requires: ["solitaire"]});
YUI.add("klondike1t", function (Y) {
	var Solitaire = Y.Solitaire,
	    Klondike = Solitaire.Klondike,
	    Klondike1T = Solitaire.Klondike1T = instance(Klondike, {
		redeal: Solitaire.noop,

		turnOver: function () {
			var deck = this.deck.stacks[0],
			    waste = this.waste.stacks[0],
			    card = deck.last();

			card && card.faceUp().moveTo(waste);
		},

		Waste: instance(Klondike.Waste, {
			Stack: instance(Solitaire.Stack)
		}),

	    	Deck: instance(Klondike.Deck, {
			Stack: instance(Klondike.Deck.Stack, {
				createNode: function () {
					Klondike.Deck.Stack.createNode.call(this);
					this.node.removeClass("playable");
				}
			})
		})
	    });
}, "0.0.1", {requires: ["klondike"]});
YUI.add("flower-garden", function (Y) {

var Solitaire = Y.Solitaire,
    FlowerGarden = Y.Solitaire.FlowerGarden = instance(Solitaire, {
	fields: ["Foundation", "Reserve", "Tableau"],

	deal: function () {
		var card,
		    deck = this.deck,
		    reserve = this.reserve.stacks[0],
		    stack = 0,
		    i,
		    stacks = this.tableau.stacks;

		for (i = 0; i < 36; i++) {
			card = deck.pop();
			stacks[stack].push(card.faceUp());			
			stack++;
			if (stack === 6) { stack = 0; }
		}

		while (card = deck.pop()) {
			card.faceUp();
			reserve.push(card);
		}
	},

	height: function () { return this.Card.base.height * 5.5; },
	maxStackHeight: function () { return this.Card.height * 4.4; },

	Stack: instance(Solitaire.Stack),

	Foundation: {
		stackConfig: {
			total: 4,
			layout: {
				hspacing: 1.25,
				top: 0,
				left: function () { return Solitaire.Card.width * 4.25; }
			}
		},
		field: "foundation",
		draggable: false
	},

	Reserve: {
		stackConfig: {
			total: 1,
			layout: {
				hspacing: 1.25,
				top: function () { return Solitaire.Card.height * 4.5; },
				left: function () { return Solitaire.Card.width * 3; }
			}
		},
		field: "reserve",
		draggable: true
	},

	Tableau: {
		stackConfig: {
			total: 6,
			layout: {
				hspacing: 1.25,
				top: function () { return Solitaire.Card.height * 1.25; },
				left: function () { return Solitaire.Card.width * 3; }
			}
		},
		field: "tableau",
		draggable: true
	},

	Card: instance(Solitaire.Card, {
		rankHeight: 24,

		createProxyStack: function () {
			var stack;

			switch (this.stack.field) {
			case "foundation":
				this.proxyStack = null;
				break;
			case "tableau":
				return Solitaire.Card.createProxyStack.call(this);
			case "reserve":
				stack = instance(this.stack);
				stack.cards = [this];
				this.proxyStack = stack;
				break;
			}

			return this.proxyStack;
		},

		moveTo: function (stack) {
			var cards = this.stack.cards,
			    index = cards.indexOf(this),
			    i, len;

			/*
			 * TODO: fix this hack
			 * if moveTo.call is called after the other card's positions have been saved, the card move is animated twice on undo
			 * the insertion of null is to preserve indexes and prevent this card from getting deleted on undo
			 */

			Solitaire.Card.moveTo.call(this, stack);

			cards.splice(index, 0, null);
			for (i = index + 1, len = cards.length; i < len; i++) {
				cards[i].pushPosition();
			}
			cards.splice(index, 1);
		},

		validTarget: function (stack) {
			var target = stack.last();

			switch (stack.field) {
			case "tableau":
				if (!target) {
					return true;
				} else {
					return target.rank === this.rank + 1;
				}
				break;
			case "foundation":
				if (!target) {
					return this.rank === 1;
				} else {
					return target.suit === this.suit && target.rank === this.rank - 1;
				}
				break;
			default:
				return false;
				break;
			}
		},

		isFree: function () {
			if (this.stack.field === "reserve") { return true; }
			else { return Solitaire.Card.isFree.call(this); }
		}
	})
}, true);

Y.Array.each(FlowerGarden.fields, function (field) {
	FlowerGarden[field].Stack = instance(FlowerGarden.Stack);
}, true);

Y.mix(FlowerGarden.Stack, {
	images: { foundation: "freeslot.png",
		  tableau: "freeslot.png" },

	validTarget: function (stack) {
		return stack.field === "tableau" && this.first().validTarget(stack);
	},

	validCard: function () { return false; }
}, true);

Y.mix(FlowerGarden.Tableau.Stack, {
	setCardPosition: function (card) {
		var last = this.cards.last(),
		    top = last ? last.top + Solitaire.game.Card.rankHeight : this.top,
		    left = this.left;

		card.left = left;
		card.top = top;
	}
}, true);

Y.mix(FlowerGarden.Reserve.Stack, {

	setCardPosition: function (card) {
		var last = this.cards.last(),
		    left = last ? last.left + Solitaire.Card.width * 0.4 : this.left,
		    top = this.top;

		card.left = left;
		card.top = top;
	},

	update: function (undo) {
		if (undo) { return; }

		var stack = this,
		    left;

		Y.Array.each(this.cards, function (card, i) {
			left = stack.left + i * card.width * 0.4;

			if (left !== card.left) {
				card.left = left;
				card.updatePosition();
			}
		});
	}
}, true);

}, "0.0.1", {requires: ["solitaire"]});
YUI.add("forty-thieves", function (Y) {

var Solitaire = Y.Solitaire,
    FortyThieves = Y.Solitaire.FortyThieves = instance(Solitaire, {
	fields: ["Foundation", "Deck", "Waste", "Tableau"],

	deal: function () {
		var card,
		    stack,
		    row,
		    deck = this.deck,
		    stacks = this.tableau.stacks;

		for (row = 0; row < 4; row++) {
			for (stack = 0; stack < 10; stack++) {
				card = deck.pop().faceUp();
				stacks[stack].push(card);
			}
		}

		deck.createStack();
	},

	redeal: function () {
		// ggpo
	},

	turnOver: function () {
		var deck = this.deck.stacks[0],
		    waste = this.waste.stacks[0],
		    i, stop;

		for (i = deck.cards.length, stop = i - 1; i > stop && i; i--) {
			deck.last().faceUp().moveTo(waste);
		}
	},

	Stack: instance(Solitaire.Stack),

	Foundation: {
		stackConfig: {
			total: 8,
			layout: {
				hspacing: 1.25,
				top: 0,
				left: function () { return Solitaire.Card.width * 3; }
			}
		},
		field: "foundation",
		draggable: false
	},

	Deck: instance(Solitaire.Deck, {
		count: 2,

		stackConfig: {
			total: 1,
			layout: {
				hspacing: 0,
				top: 0,
				left: 0
			}
		},
		field: "deck",

		init: function () {
			Solitaire.Deck.init.call(this);
			Y.Array.each(this.cards, function (c) { c.faceDown(); });
		},

		createStack: function () {
			var i, len;

			for (i = this.cards.length - 1; i >= 0; i--) {
				this.stacks[0].push(this.cards[i]);
			}
		},
	}),

	Waste: {
		stackConfig: {
			total: 1,
			layout: {
				hspacing: 0,
				top: 0,
				left: function () { return Solitaire.Card.width * 1.25; }
			}
		},
		field: "waste",
		draggable: true
	},

	Tableau: {
		stackConfig: {
			total: 10,
			layout: {
				hspacing: 1.31,
				top: function () { return Solitaire.Card.height * 1.5; },
				left: 0
			}
		},
		field: "tableau",
		draggable: true
	},

	Card: instance(Solitaire.Card, {
		validTarget: function (stack) {
			var target = stack.last();

			switch (stack.field) {
			case "tableau":
				if (!target) {
					return this.rank === 13;
				} else {
					return !target.isFaceDown && target.suit === this.suit && target.rank === this.rank + 1;
				}
				break;
			case "foundation":
				if (!target) {
					return this.rank === 1;
				} else {
					return target.suit === this.suit && target.rank === this.rank - 1;
				}
				break;
			default:
				return false;
			}
		}
	})
});

Y.Array.each(FortyThieves.fields, function (field) {
	FortyThieves[field].Stack = instance(FortyThieves.Stack);
});


Y.mix(FortyThieves.Stack, {
	cssClass: "freestack",

	validTarget: function (stack) {
		return stack.field === "tableau" &&
		    this.first().validTarget(stack);
	},

	validCard: function () { return false; }
}, true);

Y.mix(FortyThieves.Tableau.Stack, {
	setCardPosition: function (card) {
		var last = this.cards.last(),
		    top = last ? last.top + last.rankHeight : this.top,
		    left = this.left;

		card.left = left;
		card.top = top;
	}
}, true);

Y.mix(FortyThieves.Deck.Stack, {
	createDOMElement: function () {
		Solitaire.Stack.createDOMElement.call(this);
		this.node.on("click", Solitaire.Events.clickEmptyDeck);
	}
}, true);


FortyThieves.Foundation.Stack.cssClass = "freefoundation";

}, "0.0.1", {requires: ["solitaire"]});
YUI.add("freecell", function (Y) {

var Solitaire = Y.Solitaire,
    Freecell = Y.Solitaire.Freecell =  instance(Solitaire, {
	fields: ["Foundation", "Reserve", "Tableau"],

	deal: function () {
		var card,
		    stack = 0,
		    stacks = this.tableau.stacks;

		while (card = this.deck.pop()) {
			stacks[stack].push(card.faceUp());
			stack++;
			if (stack === 8) { stack = 0; }
		}
	},

	openSlots: function (exclude) {
		var total = 1,
		    freeTableaus = 0,
		    i,
		    stack,
		    rStacks = this.reserve.stacks,
		    tStacks = this.tableau.stacks;

		for (i = 0; i < 4; i++) {
			stack = rStacks[i];
			!stack.last() && total++;
		}

		for (i = 0; i < 8; i++) {
			stack = tStacks[i];
			exclude !== stack && !tStacks[i].last() && freeTableaus++;
		}

		total *= Math.pow(2, freeTableaus);

		return total;
	},

	Stack: instance(Solitaire.Stack),

	height: function () { return this.Card.base.height * 5; },

	Foundation: {
		stackConfig: {
			total: 4,
			layout: {
				hspacing: 1.25,
				top: 0,
				left: function () { return Solitaire.Card.width * 6; }
			}
		},
		field: "foundation",
		draggable: false
	},

	Reserve: {
		stackConfig: {
			total: 4,
			layout: {
				hspacing: 1.25,
				top: 0,
				left: 0
			}
		},
		field: "reserve",
		draggable: true
	},

	Tableau: {
		stackConfig: {
			total: 8,
			layout: {
				hspacing: 1.25,
				top: function () { return Solitaire.Card.height * 1.5; },
				left: 0
			}
		},
		field: "tableau",
		draggable: true
	},

	Card: instance(Solitaire.Card, {
		playable: function () {
			switch (this.stack.field) {
			case "reserve":
				return true;
			case "tableau":
				return this.createProxyStack();
			case "foundation":
				return false;
			}
		},

		createProxyStack: function () {
			var stack = Solitaire.Card.createProxyStack.call(this);

			this.proxyStack = stack && stack.cards.length <= Freecell.openSlots(stack) ? stack : null;
			return this.proxyStack;
		},

		validTarget: function (stack) {
			var target = stack.last();

			switch (stack.field) {
			case "tableau":
				if (!target) {
					return true;
				} else {
					return target.color !== this.color && target.rank === this.rank + 1;
				}
				break;
			case "foundation":
				if (!target) {
					return this.rank === 1;
				} else {
					return target.suit === this.suit && target.rank === this.rank - 1;
				}
				break;
			case "reserve":
				return !target;
				break;
			}
		}
	})
});

Y.Array.each(Freecell.fields, function (field) {
	Freecell[field].Stack = instance(Freecell.Stack);
}, true);

Y.mix(Freecell.Stack, {
	validTarget: function (stack) {
		if (stack.field !== "tableau" ||
		    !this.first().validTarget(stack)) { return false; }

		return this.cards.length <= Freecell.openSlots(stack, this.last());
	}
}, true);

Y.mix(Freecell.Tableau.Stack, {
	setCardPosition: function (card) {
		var last = this.cards.last(),
		    top = last ? last.top + last.rankHeight : this.top,
		    left = this.left;

		card.left = left;
		card.top = top;
	}
}, true);

}, "0.0.1", {requires: ["solitaire"]});
YUI.add("grandfathers-clock", function (Y) {

function wrap(array, index) {
	var len = array.length;

	index %= len;
	if (index < 0) { index += len; }

	return array[index];
}

function inRange(low, high, value) {
	if (low <= high) {
		return low <= value && value <= high;
	} else {
		return low <= value || value <= high;
	}
}

Y.namespace("Solitaire.GClock");

var Solitaire = Y.Solitaire,
    GClock = Y.Solitaire.GClock = instance(Solitaire, {
	fields: ["Foundation", "Tableau"],

	deal: function () {
		var card,
		    deck = this.deck,
		    cards = deck.cards,
		    clock = [],
		    suits = ["d", "c", "h", "s"],
		    found,
		    stack = 0,
		    i = 51, rank,
		    foundations = this.foundation.stacks,
		    stacks = this.tableau.stacks;

		while (i >= 0) {
			card = cards[i];
			found = false;

			for (rank = 2; rank <= 13; rank++) {
				if (card.rank === rank && card.suit === wrap(suits, rank)) {
					found = true;
					cards.splice(i, 1);
					clock[rank - 2] = card.faceUp();
					break;
				}
			}

			if (!found) {
				stacks[stack].push(card.faceUp());
				stack = (stack + 1) % 8;
			}
			i--;
		}

		for (i = 0; i < 12; i++) {
			foundations[(i + 2) % 12].push(clock[i]);
		}
	},

	height: function () { return this.Card.base.height * 6.7; },

	Stack: instance(Solitaire.Stack),

	Foundation: {
		stackConfig: {
			total: 12,
			layout: {
				hspacing: 1.25,
				top: function () { return Solitaire.Card.height * 3; },
				left: function () { return Solitaire.Card.width * 3.25; }
			}
		},
		field: "foundation",
		draggable: false
	},

	Tableau: {
		stackConfig: {
			total: 8,
			layout: {
				hspacing: 1.25,
				top: 0,
				left: function () { return Solitaire.Card.width * 7.25; }
			}
		},
		field: "tableau",
		draggable: true
	},

	Card: instance(Solitaire.Card, {
		createProxyStack: function () {
			var stack;

			switch (this.stack.field) {
			case "foundation":
				this.proxyStack = null;
				break;
			case "tableau":
				return Solitaire.Card.createProxyStack.call(this);
			}

			return this.proxyStack;
		},

		validTarget: function (stack) {
			var target = stack.last(),
			    rank,
			    hour;

			switch (stack.field) {
			case "tableau":
				if (!target) {
					return true;
				} else {
					return target.rank === this.rank + 1;
				}
				break;
			case "foundation":
				hour = (stack.index() + 3) % 12;
				rank = target.rank;

				return  target.suit === this.suit &&
					(target.rank + 1) % 13 === this.rank % 13 &&
					inRange(stack.first().rank, hour, this.rank);
				break;
			default:
				return false;
				break;
			}
		}
	})
});

Y.Array.each(GClock.fields, function (field) {
	GClock[field].Stack = instance(GClock.Stack);
}, true);

Y.mix(GClock.Stack, {
	validTarget: function (stack) {
		return stack.field === "tableau" && this.first().validTarget(stack);
	},

	validCard: function () { return false; }
}, true);

Y.mix(GClock.Tableau.Stack, {
	setCardPosition: function (card) {
		var last = this.cards.last(),
		    top = last ? last.top + last.rankHeight : this.top,
		    left = this.left;

		card.left = left;
		card.top = top;
	}
}, true);

Y.mix(GClock.Foundation.Stack, {
	index: function () {
		return GClock.foundation.stacks.indexOf(this);
	},

	layout: function (layout, i) {
		var top = Math.sin(Math.PI * i / 6) * Solitaire.Card.height * 2.25,
		    left = Math.cos(Math.PI * i / 6) * Solitaire.Card.width * 3;

		this.top = top + normalize(layout.top);
		this.left = left + normalize(layout.left);
	}
}, true);

}, "0.0.1", {requires: ["solitaire"]});
YUI.add("monte-carlo", function (Y) {

var Solitaire = Y.Solitaire,
    MonteCarlo = Y.Solitaire.MonteCarlo = instance(Solitaire, {
	fields: ["Foundation", "Deck", "Tableau"],

	createEvents: function () {
		Solitaire.createEvents.call(this);

		Y.delegate("click", Solitaire.Events.clickEmptyDeck, Solitaire.selector, ".stack");

		Y.on("solitaire|endTurn", this.deckPlayable);
		Y.on("solitaire|afterSetup", this.deckPlayable);
	},

	deckPlayable: function () {
		var gap = false,
		    node = Game.deck.stacks[0].node;

		Game.eachStack(function (s) {
			if (!gap && Y.Array.indexOf(s.cards, null) !== -1) {
				gap = true;
			}
		}, "tableau");

		if (gap) {
			node.addClass("playable");
		} else {
			node.removeClass("playable");
		}
	},

	deal: function () {
		var card,
		    stack,
		    i,
		    deck = this.deck,
		    stacks = this.tableau.stacks;

		for (stack = 0; stack < 5; stack++) {
			for (i = 0; i < 5; i++) {
				card = deck.pop().faceUp();
				stacks[stack].push(card);
			}
		}

		deck.createStack();
	},

	/*
	 * 1) gather all tableau cards into an array
	 * 2) clear every tableau row/stack, then redeal the cards from the previous step onto the tableau
	 * 3) deal cards from the deck to fill the remaining free rows
	 */
	redeal: function () {
		var stacks = this.tableau.stacks,
		    deck = this.deck.stacks[0],
		    cards = Y.Array.reduce(stacks, [], function (compact, stack) {
			return compact.concat(stack.compact());
			}),
		    len = cards.length,
		    card,
		    s, i;

		Y.Array.each(stacks, function (stack) {
			stack.node.remove();
			stack.cards = [];
			stack.createNode();
		});

		for (i = s = 0; i < len; i++) {
			if (i && !(i % 5)) { s++; }
			stacks[s].push(cards[i]);
		}

		while (i < 25 && deck.cards.length) {
			if (!(i % 5)) { s++; }
			card = deck.last().faceUp();
			card.moveTo(stacks[s]);
			card.node.setStyle("zIndex", 100 - i);
			i++;
		}

	},

	height: function () { return this.Card.base.height * 6; },

	Stack: instance(Solitaire.Stack, {
		images: { deck: "freeslot.png" },

		updateDragGroups: function () {
			var active = Solitaire.activeCard;

			Y.Array.each(this.cards, function (c) {
				if (!c) { return; }

				if (active.validTarget(c)) {
					c.node.drop.addToGroup("open");
				} else
					c.node.drop.removeFromGroup("open");
			});
		},

		index: function () { return 0; }
	}),

	Events: instance(Solitaire.Events, {
		drop: function (e) {
			var active = Solitaire.activeCard,
			    foundation = Solitaire.game.foundation.stacks[0],
			    target = e.drop.get("node").getData("target");

			if (!active) { return; }

			Solitaire.stationary(function () {
				target.moveTo(foundation);
				active.moveTo(foundation);
			});

			Solitaire.endTurn();
		}
	}),

	Foundation: {
		stackConfig: {
			total: 1,
			layout: {
				spacing: 0,
				top: 0,
				left: function () { return Solitaire.Card.width * 10.5; }
			}
		},
		field: "foundation"
	},

	Deck: instance(Solitaire.Deck, {
		stackConfig: {
			total: 1,
			layout: {
				spacing: 0,
				top: 0,
				left: function () { return Solitaire.Card.width * 2}
			}
		},
		field: "deck",

		createStack: function () {
			var i, len;

			for (i = 0, len = this.cards.length; i < len; i++) {
				this.stacks[0].push(this.cards[i]);
			}
		}
	}),

	Tableau: {
		stackConfig: {
			total: 5,
			layout: {
				cardGap: 1.25,
				vspacing: 1.25,
				hspacing: 0,
				top: 0,
				left: function () { return Solitaire.Card.width * 3.5; }
			}
		},
		field: "tableau"
	},

	Card: instance(Solitaire.Card, {
		row: function () {
			return this.stack.index();
		},

		column: function () {
			return this.stack.cards.indexOf(this);
		},

		/*
		 * return true if:
		 * 1) the target card is free
		 * 2) both cards are the same rank
		 * 3) both cards are adjacent vertically, horizontally, or diagonally
		 */

		validTarget: function (card) {
			if (!(this.rank === card.rank && card.isFree())) { return false; }

			return Math.abs(card.row() - this.row()) <= 1 &&
				Math.abs(card.column() - this.column()) <= 1;
		},

		createProxyStack: function () {
			var stack = null;

			if (this.isFree()) {
				stack = instance(this.stack);
				stack.cards = this.proxyCards();
			}

			this.proxyStack = stack;

			return this.proxyStack;
		},

		proxyCards: function () {
			return [this];
		},

		isFree: function () {
			return this.stack.field === "tableau";
		},

		turnOver: function () {
			this.stack.field === "deck" && Solitaire.game.redeal();
		}
	})
});

Y.Array.each(MonteCarlo.fields, function (field) {
	MonteCarlo[field].Stack = instance(MonteCarlo.Stack);
});

// Each tableau row is treated as a "stack"
Y.mix(MonteCarlo.Tableau.Stack, {
	deleteItem: function (card) {
		var cards = this.cards,
		    i = cards.indexOf(card);

		if (i !== -1) { cards[i] = null; }
	},

	setCardPosition: function (card) {
		var last = this.cards.last(),
		    layout = MonteCarlo.Tableau.stackConfig.layout,
		    top = this.top,
		    left = last ? last.left + card.width * layout.cardGap : this.left;

		card.left = left;
		card.top = top;
	},

	compact: function () {
		var cards = this.cards,
		    card,
		    compact = [],
		    i, len;

		for (i = 0, len = cards.length; i < len; i++) {
			card = cards[i];
			if (card) {
				compact.push(card);
				card.pushPosition();
			}
		}

		return compact;
	},

	index: function () {
		return Solitaire.game.tableau.stacks.indexOf(this);
	}
}, true);

Y.mix(MonteCarlo.Deck.Stack, {
	updateDragGroups: function () {
		var active = Solitaire.activeCard,
		    card = this.last();

		if (!card) { return; }

		if (active.validTarget(card)) {
			card.node.drop.addToGroup("open");
		} else {
			card.node.drop.removeFromGroup("open");
		}
	}
}, true);

}, "0.0.1", {requires: ["solitaire", "array-extras"]});
YUI.add("pyramid", function (Y) {

var Solitaire = Y.Solitaire,
    Pyramid = Y.Solitaire.Pyramid = instance(Solitaire, {
	fields: ["Foundation", "Deck", "Waste", "Tableau"],

	deal: function () {
		var card,
		    stack,
		    i,
		    deck = this.deck,
		    stacks = this.tableau.stacks;

		for (stack = 0; stack < 7; stack++) {
			for (i = 0; i <= stack; i++) {
				card = deck.pop().faceUp();
				stacks[stack].push(card);
			}
		}

		deck.createStack();
		deck.last().faceUp();
	},

	turnOver: function () {
		var deck = this.deck.stacks[0],
		    waste = this.waste.stacks[0];

		if (deck.cards.length === 1) { return; }
		deck.last().moveTo(waste);
	},

	height: function () { return this.Card.base.height * 4.85; },

	Stack: instance(Solitaire.Stack, {
		images: {},

		updateDragGroups: function () {
			var active = Solitaire.activeCard;

			Y.Array.each(this.cards, function (c) {
				if (!c) { return; }

				if (active.validTarget(c)) {
					c.node.drop.addToGroup("open");
				} else {
					c.node.drop.removeFromGroup("open");
				}
			});
		}
	}),

	Events: instance(Solitaire.Events, {
		dragCheck: function (e) {
			if (!Solitaire.game.autoPlay.call(this)) {
				Solitaire.Events.dragCheck.call(this);
			}
		},

		drop: function (e) {
			var active = Solitaire.activeCard,
			    foundation = Solitaire.game.foundation.stacks[0],
			    target = e.drop.get("node").getData("target");

			if (!active) { return; }

			Solitaire.stationary(function () {
				target.moveTo(foundation);
				active.moveTo(foundation);
			});

			Solitaire.endTurn();
		}
	}),

	Foundation: {
		stackConfig: {
			total: 1,
			layout: {
				hspacing: 0,
				top: 0,
				left: function () { return Solitaire.Card.width * 8; }
			}
		},
		field: "foundation"
	},

	Deck: instance(Solitaire.Deck, {
		stackConfig: {
			total: 1,
			layout: {
				hspacing: 0,
				top: 0,
				left: 0
			}
		},
		field: "deck",

		createStack: function () {
			var i, len;

			for (i = 0, len = this.cards.length; i < len; i++) {
				this.stacks[0].push(this.cards[i]);
			}
		}
	}),

	Waste: {
		stackConfig: {
			total: 1,
			layout: {
				hspacing: 0,
				top: 0,
				left: function () { return Solitaire.Card.width * 1.5; }
			}
		},
		field: "waste"
	},

	Tableau: {
		stackConfig: {
			total: 7,
			layout: {
				vspacing: 0.6,
				hspacing: -0.625,
				cardGap: 1.25,
				top: 0,
				left: function () { return Solitaire.Card.width * 5; }
			}
		},
		field: "tableau"
	},

	Card: instance(Solitaire.Card, {
		validTarget: function (card) {
			if (card.field === "foundation") { // "card" is actually a stack :/
				return this.isFree() && this.rank === 13;
			}

			if (card.isFree()) {
				return this.rank + card.rank === 13;
			}

			return false;
		},

		createProxyNode: function () {
			return this.rank === 13 ?
				"" :
				Solitaire.Card.createProxyNode.call(this);
		},

		createProxyStack: function () {
			var stack = null;

			if (this.isFree()) {
				stack = instance(this.stack);
				stack.cards = this.proxyCards();
			}

			this.proxyStack = stack;

			return this.proxyStack;
		},

		proxyCards: function () {
			return [this];
		},

		isFree: function () {
			var stack = this.stack,
			    stackIndex = stack.index(),
			    index = stack.cards.indexOf(this),
			    game = Solitaire.game,
			    next = stack.next();

			if (stack.field === "deck" || stack.field === "waste") {
				return !this.isFaceDown;
			} else {
				return !(this.stack.field === "foundation" ||
					next &&
					(next.cards[index] || next.cards[index + 1]));
			}
		},

		turnOver: function () {
			this.stack.field === "deck" && !this.isFaceDown && Solitaire.game.turnOver();
		}
	})
});

Y.Array.each(Pyramid.fields, function (field) {
	Pyramid[field].Stack = instance(Pyramid.Stack);
});

Y.mix(Pyramid.Tableau.Stack, {
	deleteItem: function (card) {
		var cards = this.cards,
		    i = cards.indexOf(card);

		if (i !== -1) { cards[i] = null; }
	},

	setCardPosition: function (card) {
		var layout = Pyramid.Tableau.stackConfig.layout,
		    last = this.cards.last(),
		    top = this.top,
		    left = last ? last.left + card.width * layout.cardGap : this.left;

		card.left = left;
		card.top = top;
		card.zIndex = this.index() * 10;
	}
}, true);

Y.mix(Pyramid.Deck.Stack, {
	deleteItem: function (card) {
		Pyramid.Stack.deleteItem.call(this, card);
		this.update();
	},

	update: function (undo) {
		var last = this.last();

		last && last.faceUp(undo);
	},


	updateDragGroups: function () {
		var active = Solitaire.activeCard,
		    card = this.last();

		if (!card) { return; }

		if (active.validTarget(card)) {
			card.node.drop.addToGroup("open");
		} else {
			card.node.drop.removeFromGroup("open");
		}
	}
}, true);

Pyramid.Waste.Stack.updateDragGroups = Pyramid.Deck.Stack.updateDragGroups;

}, "0.0.1", {requires: ["solitaire"]});
YUI.add("russian-solitaire", function (Y) {

  var Solitaire = Y.Solitaire,
    Yukon = Solitaire.Yukon,
    RussianSolitaire = Solitaire.RussianSolitaire = instance(Yukon, {
      Card: instance(Yukon.Card)
    });

  RussianSolitaire.Card.validTarget = function (stack) {
    var target = stack.last();

    switch (stack.field) {
    case "tableau":
      if (!target) {
         return this.rank === 13;
       } else {
         return !target.isFaceDown && target.suit === this.suit && target.rank === this.rank + 1;
       }
    case "foundation":
      if (!target) {
        return this.rank === 1;
      } else {
        return target.suit === this.suit && target.rank === this.rank - 1;
      }
    default:
      return false;
    }
  };
}, "0.0.1", {requires: ["yukon"]});
YUI.add("scorpion", function (Y) {

var Solitaire = Y.Solitaire,
    Scorpion = Solitaire.Scorpion = instance(Solitaire, {
	fields: ["Foundation", "Deck", "Tableau"],

	createEvents: function () {
		Solitaire.AutoStackClear.register();
		Solitaire.createEvents.call(this);
	},

	deal: function () {
		var card,
		    stack,
		    row,
		    deck = this.deck,
		    stacks = this.tableau.stacks;

		for (row = 0; row < 7; row++) {
			for (stack = 0; stack < 7; stack++) {
				card = deck.pop();

				if (!(row < 3 && stack < 4)) { card.faceUp(); }

				stacks[stack].push(card);
			}
		}

		deck.createStack();
	},

	turnOver: function () {
		var deck = this.deck.stacks[0],
		    stacks = this.tableau.stacks,
		    i, len;

		for (i = 0; i < 3; i++) {
			deck.last().faceUp().moveTo(stacks[i]);
		}
	},

	height: function () { return this.Card.base.height * 5.6; },

	Stack: instance(Solitaire.Stack),

	Deck: instance(Solitaire.Deck, {
		stackConfig: {
			total: 1,
			layout: {
				top: 0,
				left: function () { return Solitaire.Card.width * 9; }
			},
		},
		field: "deck",

		createStack: function () {
			var i, len;

			for (i = this.cards.length - 1; i >= 0; i--) {
				this.stacks[0].push(this.cards[i]);
			}
		},
	}),

	Foundation: {
		stackConfig: {
			total: 4,
			layout: {
				top: function () { return Solitaire.Card.height * 1.1; },
				left: function () { return Solitaire.Card.width * 9; },
				vspacing: 1.1,
			}
		},
		field: "foundation"
	},

	Tableau: {
		stackConfig: {
			total: 7,
			layout: {
				hspacing: 1.25,
				top: 0,
				left: 0
			}
		},
		field: "tableau"
	},

	Card: instance(Solitaire.Card, {
		playable: function () {
			var field = this.stack.field;

			return field === "deck" || field === "tableau" && !this.isFaceDown;
		},

		validTarget: function (stack) {
			var target = stack.last();

			if (stack.field !== "tableau") { return false; }

			if (!target) {
				return this.rank === 13;
			} else {
				return !target.isFaceDown && target.suit === this.suit && target.rank === this.rank + 1;
			}
		}
	})
});

Y.Array.each(Scorpion.fields, function (field) {
	Scorpion[field].Stack = instance(Scorpion.Stack);
});


Y.mix(Scorpion.Stack, {
	validTarget: function (stack) {
		return stack.field === "tableau" &&
		    this.first().validTarget(stack);
	},

	validProxy: function (card) {
		return true;
	},

	validTarget: function (stack) {
		var rank,
		    cards = this.cards,
		    i;

		switch (stack.field) {
		case "tableau":
			return this.first().validTarget(stack);
			break;
		case "foundation":
			rank = this.last.rank;
			if (cards.length !== 13) { return false; }

			for (i = 0; i < 13; i++) {
				if (cards[i].rank !== rank) { return false; }
			}

			return true;
			break;
		}
	}
}, true);

Y.mix(Scorpion.Tableau.Stack, {
	setCardPosition: function (card) {
		var last = this.cards.last(),
		    top = last ? last.top + last.rankHeight : this.top,
		    left = this.left;

		card.left = left;
		card.top = top;
	}
}, true);

}, "0.0.1", {requires: ["auto-stack-clear"]});
YUI.add("spider", function (Y) {

var Solitaire = Y.Solitaire,
    Spider = Solitaire.Spider = instance(Solitaire, {
	fields: ["Foundation", "Deck", "Tableau"],

	createEvents: function () {
		Solitaire.AutoStackClear.register();
		Solitaire.createEvents.call(this);
	},

	deal: function () {
		var stack = 0,
		    deck = this.deck,
		    stacks = this.tableau.stacks,
		    row;

		for (row = 0; row < 5; row++) {
			for (stack = 0; stack < 10; stack++) {
				if (stack < 4 || row < 4) {
					stacks[stack].push(deck.pop());			
				}
			}
		}

		for (stack = 0; stack < 10; stack++) {
			stacks[stack].push(deck.pop().faceUp());
		}

		deck.createStack();
	},

	redeal: function () {},

	turnOver: function () {
		var deck = this.deck.stacks[0],
		    i, len;

		if (hasFreeTableaus()) {
			return;
		}

		this.eachStack(function (stack) {
			var card = deck.last();

			if (card) {
				card.faceUp().moveTo(stack).after(function () {
					this.stack.updateCardsPosition();
				});
			}
		}, "tableau");
	},

	Stack: instance(Solitaire.Stack),

	Foundation: {
		stackConfig: {
			total: 8,
			layout: {
				hspacing: 1.25,
				top: 0,
				left: function () { return Solitaire.Card.width * 2.5; }
			}
		},
		field: "foundation",
		draggable: false
	},

	Deck: instance(Solitaire.Deck, {
		count: 2,

		stackConfig: {
			total: 1,
			layout: {
				hspacing: 0,
				top: 0,
				left: 0
			}
		},
		field: "deck"
	}),

	Tableau: {
		stackConfig: {
			total: 10,
			layout: {
				hspacing: 1.25,
				top: function () { return Solitaire.Card.height * 1.5; },
				left: 0
			}
		},
		field: "tableau",
	},

	Card: instance(Solitaire.Card, {
		playable: function () {
			var previous = this.stack[this.index - 1];

			switch (this.stack.field) {
			case "tableau":
				return this.createProxyStack();
			case "deck": 
				return !hasFreeTableaus(); case "foundation":
				return false;
			}
		},

		validTarget: function (stack) {
			if (stack.field !== "tableau") { return false; }

			var target = stack.last();

			return !target || !target.isFaceDown && target.rank === this.rank + 1;
		}
	})
});

function hasFreeTableaus() {
	return Y.Array.some(Game.tableau.stacks, function (stack) {
		return !stack.cards.length;
	});
}

Y.Array.each(Spider.fields, function (field) {
	Spider[field].Stack = instance(Spider.Stack);
});


Y.mix(Spider.Stack, {
	validCard: function (card) {
		return card.suit === this.cards.last().suit;
	},

	validTarget: function (stack) {
		switch (stack.field) {
		case "tableau":
			return this.first().validTarget(stack);
			break;
		case "foundation":
			return this.cards.length === 13;
			break;
		}
	}
}, true);

Y.mix(Spider.Tableau.Stack, {
	setCardPosition: function (card) {
		var last = this.cards.last(),
		    top = last ? last.top + last.rankHeight : this.top,
		    left = this.left;

		card.left = left;
		card.top = top;
	}
}, true);
}, "0.0.1", {requires: ["auto-stack-clear"]});
YUI.add("spider1s", function (Y) {
	var Spider = Y.Solitaire.Spider1S = instance(Y.Solitaire.Spider);

	Spider.Deck = instance(Y.Solitaire.Spider.Deck, {
		suits: ["s"],
		count: 8
	});
}, "0.0.1", {requires: ["spider"]});
YUI.add("spider2s", function (Y) {
	var Spider = Y.Solitaire.Spider2S = instance(Y.Solitaire.Spider);

	Spider.Deck = instance(Y.Solitaire.Spider.Deck, {
		suits: ["s", "h"],
		count: 4
	});
}, "0.0.1", {requires: ["spider"]});
YUI.add("spiderette", function (Y) {
	var Solitaire = Y.Solitaire,
	    Klondike = Solitaire.Klondike,
	    Spider = Solitaire.Spider,
	    Spiderette = Y.Solitaire.Spiderette = instance(Spider, {
		height: Klondike.height,
		deal: Klondike.deal,

		Tableau: instance(Spider.Tableau, {
			stackConfig: Klondike.Tableau.stackConfig
		}),
		Foundation: instance(Spider.Foundation, {
			stackConfig: Klondike.Foundation.stackConfig
		}),

		Deck: instance(Spider.Deck, {
			count: 1
		})
	    });
}, "0.0.1", {requires: ["klondike", "spider"]});
YUI.add("tri-towers", function (Y) {
	var Solitaire = Y.Solitaire,
	TriTowers = Y.Solitaire.TriTowers = instance(Solitaire, {
		fields: ["Deck", "Foundation", "Tableau"],

		width: function () { return this.Card.base.width * 15; },
		height: function () { return this.Card.base.height * 5; },
		createEvents: function () {
			Y.on("solitaire|endTurn", function () {
				var tableaus = Solitaire.game.tableau.stacks,
				    i;

				for (i = 0; i < 3; i++) {
					Y.fire("tableau:afterPop", tableaus[i]);
				}
			});

			Solitaire.createEvents.call(this);
		},

		deal: function () {
			var card,
			    stack,
			    stacks = this.tableau.stacks,
			    deck = this.deck,
			    foundation = this.foundation.stacks[0],

			    i, stackLength;

			for (stack = 0; stack < 4; stack++) {
				stackLength = (stack + 1) * 3;

				for (i = 0; i < stackLength; i++) {
					card = deck.pop();
					stacks[stack].push(card);
					stack === 3 && card.faceUp();
				}
			}

			card = deck.pop().faceUp();
			foundation.push(card);

			deck.createStack();
		},

		turnOver: function () {
			var deck = this.deck.stacks[0],
			    foundation = this.foundation.stacks[0],
			    last = deck.last();

			last && last.faceUp().moveTo(foundation);
		},

		isWon: function () {
			var won = true;

			this.eachStack(function (stack) {
				stack.eachCard(function (card) {
					if (card) { won = false; }

					return won;
				});
			}, "tableau");

			return won;
		},

		Deck: instance(Solitaire.Deck, {
			field: "deck",
			stackConfig: {
				total: 1,
				layout: {
					hspacing: 0,
					top: function () { return Solitaire.Card.height * 4; },
					left: 0
				}
			},

			createStack: function () {
				var i, len;

				for (i = 0, len = this.cards.length; i < len; i++) {
					this.stacks[0].push(this.cards[i]);
				}
			}
		}),

		Tableau: {
			field: "tableau",
			stackConfig: {
				total: 4,
				layout: {
					rowGaps: [3.75, 2.5, 1.25, 0],
					cardGap: 1.25,
					vspacing: 0.6,
					hspacing: -0.625,
					top: 0,
					left: function () { return Solitaire.Card.width * 1.875; }
				}
			}
		},

		Foundation: {
			field: "foundation",
			stackConfig: {
				total: 1,
				layout: {
					hspacing: 0,
					top: function () { return Solitaire.Card.height * 4; },
					left: function () { return Solitaire.Card.width * 4; }
				}
			}
		},

		Events: instance(Solitaire.Events, {
			dragCheck: function (e) {
				this.getCard().autoPlay();

				/* workaround because YUI retains stale drag information if we halt the event :\ */
				this._afterDragEnd();
				e.halt();
			}
		}),

		Card: instance(Solitaire.Card, {
			/*
			 * return true if the target is 1 rank away from the this card
			 * Aces and Kings are valid targets for each other
			 */
			validTarget: function (stack) {
				if (stack.field !== "foundation") { return false; }

				var card = stack.last(),
				    diff = Math.abs(this.rank - card.rank);

				return diff === 1 || diff === 12;
			},

			playable: function () {
				var stack = this.stack;

				return (stack.field === "deck" && this === stack.last()) ||
					(this.isFree() && this.validTarget(Game.foundation.stacks[0]));
			},

			isFree: function () {
				var stack = this.stack,
				    next = stack.next(),
				    tower = this.tower(),
				    index = stack.cards.indexOf(this),
				    i;

				if (stack.field !== "tableau") { return false; }

				if (!next) { return true; }

				for (i = 0; i < 2; i++) {
					if (next.cards[index + tower + i]) { return false; }
				}

				return true;
			},

			tower: function () {
				var stack = this.stack,
				    index = stack.cards.indexOf(this),
				    stackIndex = stack.index() + 1;

				return Math.floor(index / stackIndex);
			}
		}),
		     
		Stack: instance(Solitaire.Stack, {
			images: {}
		})
	}, true);

	Y.Array.each(TriTowers.fields, function (field) {
		TriTowers[field].Stack = instance(TriTowers.Stack);
	});

	Y.mix(TriTowers.Tableau.Stack, {
		deleteItem: function (card) {
			var cards = this.cards,
			    i = cards.indexOf(card);

			if (i !== -1) { cards[i] = null; }
		},

		setCardPosition: function (card) {
			var last = this.last(),
			    top = this.top,
			    left,
			    index,
			    stackIndex,

			    layout = TriTowers.Tableau.stackConfig.layout,
			    rowGaps = layout.rowGaps,
			    cardGap = layout.cardGap;

			if (last) {
				left = last.left + card.width * cardGap;
				index = this.cards.length;
				stackIndex = this.index() + 1;

				if (!(index % stackIndex)) { left += rowGaps[stackIndex - 1] * card.width; }
			} else {
				left = this.left;
			}

			card.top = top;
			card.left = left;
			card.zIndex = this.index() * 10;
		}
	}, true);

	Y.mix(TriTowers.Deck.Stack, {
		setCardPosition: function (card) {
			var last = this.last(),
			    top,
			    left,
			    zIndex;

			top = this.top;
			if (last) {
				left = last.left + card.width * 0.1;
				zIndex = last.zIndex + 1;
			} else {
				left = this.left;
				zIndex = 0;
			}

			card.top = top;
			card.left = left;
			card.zIndex = zIndex;
		}
	}, true);
}, "0.0.1", {requires: ["solitaire"]});
YUI.add("will-o-the-wisp", function (Y) {

	var Solitaire = Y.Solitaire,
	    WillOTheWisp = Y.Solitaire.WillOTheWisp = instance(Solitaire.Spiderette, {
		deal: function () {
			var deck = this.deck,
			    row;

			for (row = 0; row < 3; row++) {
				this.eachStack(function (stack) {
					var card = deck.pop();
					if (row === 2) { card.faceUp(); }

					stack.push(card);
				}, "tableau");
			}

			deck.createStack();
		}
	    });
}, "0.0.1", {requires: ["spiderette"]});
YUI.add("yukon", function (Y) {

var Solitaire = Y.Solitaire,
    Yukon = Solitaire.Yukon = instance(Solitaire, {
	fields: ["Foundation", "Tableau"],

	deal: function () {
		var card,
		    piles = 6,
		    stack = 0,
		    deck = this.deck,
		    stacks = this.tableau.stacks;

		while (piles >= 0) {
			card = deck.pop().faceUp();
			stacks[6 - piles].push(card);

			for (stack = 7 - piles; stack < 7; stack++) {
				card = deck.pop();
				stacks[stack].push(card);			
			}
			piles--;
		}

		stack = 1;
		while (deck.cards.length) {
			card = deck.pop().faceUp();
			stacks[stack].push(card);
			stack = (stack % 6) + 1;
		}
	},

	height: function () { return this.Card.base.height * 4.8; },

	Stack: instance(Solitaire.Stack),

	Foundation: {
		stackConfig: {
			total: 4,
			layout: {
				vspacing: 1.25,
				top: 0,
				left: function () { return Solitaire.Card.width * 9; }
			}
		},
		field: "foundation",
		draggable: false
	},

	Tableau: {
		stackConfig: {
			total: 7,
			layout: {
				hspacing: 1.25,
				top: 0,
				left: 0
			}
		},
		field: "tableau",
		draggable: true
	},

	Card: instance(Solitaire.Card, {
		playable: function () {
			return this.stack.field === "tableau" && !this.isFaceDown;
		},

		validTarget: function (stack) {
			var target = stack.last();

			switch (stack.field) {
			case "tableau":
				if (!target) {
					return this.rank === 13;
				} else {
					return !target.isFaceDown && target.color !== this.color && target.rank === this.rank + 1;
				}
				break;
			case "foundation":
				if (!target) {
					return this.rank === 1;
				} else {
					return target.suit === this.suit && target.rank === this.rank - 1;
				}
				break;
			default:
				return false;
			}
		}
	})
});

Y.Array.each(Yukon.fields, function (field) {
	Yukon[field].Stack = instance(Yukon.Stack);
});


Y.mix(Yukon.Stack, {
	validTarget: function (stack) {
		return stack.field === "tableau" &&
		    this.first().validTarget(stack);
	},

	validProxy: function (card) {
		return true;
	}
}, true);

Y.mix(Yukon.Tableau.Stack, {
	setCardPosition: function (card) {
		var last = this.cards.last(),
		    top = last ? last.top + last.rankHeight : this.top,
		    left = this.left;

		card.left = left;
		card.top = top;
	}
}, true);

}, "0.0.1", {requires: ["solitaire"]});
(function () {
	var active = {
		name: "klondike",
		game: null
	    },
	    yui = YUI({ base: "js/yui-unpack/yui/build/" }), Y,
	    games = {
		"agnes": "Agnes",
		"klondike": "Klondike",
		"klondike1t": "Klondike1T",
		"flower-garden": "FlowerGarden",
		"forty-thieves": "FortyThieves",
		"freecell": "Freecell",
		"golf": "Golf",
		"grandfathers-clock": "GClock",
		"monte-carlo": "MonteCarlo",
		"pyramid": "Pyramid",
		"russian-solitaire": "RussianSolitaire",
		"scorpion": "Scorpion",
		"spider": "Spider",
		"spider1s": "Spider1S",
		"spider2s": "Spider2S",
                "spiderette": "Spiderette",
		"tri-towers": "TriTowers",
		"will-o-the-wisp": "WillOTheWisp",
		"yukon": "Yukon"},

	    extensions = [
		"auto-turnover",
	        "statistics",
		"solver-freecell",
		"solitaire-autoplay",
	        "solitaire-ios",
		"solitaire-background-fix"],

	Fade = (function() {
		var el = null,
		    body,
		    css = {
		    position: "absolute",
		    display: "none",
		    backgroundColor: "#000",
		    opacity: 0.7,
		    top: 0,
		    left: 0,
		    width: 0,
		    height: 0,
		    zIndex: 1000,
		},

		element = function() {
			if (el === null) {
				el = Y.Node.create("<div>");
				el.setStyles(css);
				body = Y.one("body").append(el);
			}
			return el;
		};

		return {
			show: function() {
				var el = element();

				css.display = "block";
				css.width = el.get("winWidth");
				css.height = el.get("winHeight");

				el.setStyles(css);

			},

			hide: function() {
				css.display = "none";
				element().setStyles(css);
			}
		};
	}()),

	GameChooser = {
		selected: null,
		fade: false,

		init: function () {
			this.refit();
		},

		refit: function () {
			var node = Y.one("#game-chooser"),
			    height = node.get("winHeight");

			node.setStyle("min-height", height);
		},

		show: function (fade) {
			if (!this.selected) {
				this.select(active.name);
			}

			if (fade) {
				Fade.show();
				this.fade = true;
			}

			Y.one("#game-chooser").addClass("show");
			Y.one("body").addClass("scrollable");
		},

		hide: function () {
			if (this.fade) {
				Fade.hide();
			}

			Y.one("#game-chooser").removeClass("show");
			Y.fire("gamechooser:hide", this);
			Y.one("body").removeClass("scrollable");
		},

		choose: function () {
			if (!this.selected) { return; }

			this.hide();
			playGame(this.selected);
		},

		select: function (game) {
			var node = Y.one("#" + game + "> div"),
			    previous = this.selected;
			
			if (previous !== game) {
				this.unSelect();
			}

			if (node) {
				this.selected = game;
				new Y.Node(document.getElementById(game)).addClass("selected");
			}

			if (previous && previous !== game) {
				Y.fire("gamechooser:select", this);
			}
		},

		unSelect: function () {
			if (!this.selected) { return; }

			new Y.Node(document.getElementById(this.selected)).removeClass("selected");
			this.selected = null;
		}
	},

	/* theres no mechanism yet to load the appropriate deck depending on the scaled card width
	 * so we just load the 122x190 cards and call it a day :/
	 */
	Themes = {
		dondorf: {
			sizes: [61, 79, 95, 122],
			61: {
				hiddenRankHeight: 7,
				rankHeight: 25,
				dimensions: [61, 95]
			},

			79: {
				hiddenRankHeight: 10,
				rankHeight: 32,
				dimensions: [79, 123]
			},

			95: {
				hiddenRankHeight: 12,
				rankHeight: 38,
				dimensions: [95, 148]
			},

			122: {
				hiddenRankHeight: 15,
				rankHeight: 48,
				dimensions: [122, 190]
			}
		},

		snapToSize: function (width) {
			var theme,
			    sizes = theme.sizes;

			width = clamp(width, sizes[0], sizes[sizes.length - 1]) >>> 0;

			while (Y.Array.indexOf(sizes, width) === -1) {
				width++;
			}

			return width;
		},

		load: function (name) {
			var Solitaire = Y.Solitaire,
			    base = Solitaire.Card.base;

			if (!(name in this)) {
				name = "dondorf";
			}

			if (base.theme !== name) {
				this.set(name, 122);
			}
		},

		set: function (name, size) {
			var theme = this[name][size];

			Y.mix(Y.Solitaire.Card.base, {
				theme: name + "/" + size,
				hiddenRankHeight: theme.hiddenRankHeight,
				rankHeight: theme.rankHeight,
				width: theme.dimensions[0],
				height: theme.dimensions[1]
			}, true);
		}
	};


	function modules() {
		var modules = extensions.slice(),
		    m;

		for (m in games) {
			if (games.hasOwnProperty(m)) {
				modules.unshift(m);
			}
		}

		return modules;
	}

	function main(YUI) {
		Y = YUI;

		exportAPI();
		Y.on("domready", load);
	}

	function showDescription() {
		GameChooser.select(this._node.id);
		GameChooser.choose();
	}

	function attachEvents() {
		Y.on("click", restart, Y.one("#restart"));
		Y.on("click", function () { GameChooser.show(false); }, Y.one("#choose_game"));
		Y.on("click", function () { active.game.undo(); }, Y.one("#undo"));
		Y.on("click", newGame, Y.one("#new_deal"));

		Y.on("click", hideChromeStoreLink, Y.one(".chromestore"));

		Y.delegate("click", showDescription, "#descriptions", "li");

                Y.on("click", function () { GameChooser.hide(); }, Y.one("#close-chooser"));
		Y.one("document").on("keydown", function (e) {
			e.keyCode === 27 && GameChooser.hide();
		});

		Y.on("afterSetup", function() {
			active.game.stationary(function () {
				resize()
			});
		});

		attachResize();
	}

	function attachResize() {
		var timer,
		    delay = 250,
		    attachEvent;

		if (window.addEventListener) {
			attachEvent = "addEventListener";
		} else if (window.attachEvent) {
			attachEvent = "attachEvent";
		}

		window[attachEvent](Y.Solitaire.Application.resizeEvent, function () {
			clearTimeout(timer);
			timer = setTimeout(resize, delay);
		}, false);
	}

	function resize() {
		var game = active.game,
		    el = game.container(),
		    padding = Y.Solitaire.padding,
		    offset = Y.Solitaire.offset,
		    width = el.get("winWidth") - padding.x,
		    height = el.get("winHeight") - padding.y,
		    ratio = 1;

		Y.Solitaire.Application.windowHeight = height;
		ratio = Math.min((width - offset.left) / game.width(), (height - offset.top) / game.height());

		active.game.resize(ratio);
		GameChooser.refit();
	}

	function playGame(name) {
		var twoWeeks = 1000 * 3600 * 24 * 14;

		active.name = name;
		active.game = Y.Solitaire[games[name]];
		Y.Cookie.set("options", name, {expires: new Date(new Date().getTime() + twoWeeks)});
		newGame();
	}

	function loadOptions() {
		var options = Y.Cookie.get("options");

		options && (active.name = options);

		Themes.load("dondorf");
	}

	function load() {
		var save = Y.Cookie.get("saved-game");

		attachEvents();
		loadOptions();

		Preloader.preload();
		Preloader.loaded(function () {
			showChromeStoreLink();
			if (save) {
				clearDOM();
				active.game = Y.Solitaire[games[active.name]];
				active.game.loadGame(save);
			} else {
				playGame(active.name);
			}
		});

		GameChooser.init();
	}

	function clearDOM() {
		Y.all(".stack, .card").remove();
	}

	function restart() {
		var init = Y.Cookie.get("initial-game"),
		    game = active.game;

		if (init) {
			clearDOM();
			game.cleanup();
			game.loadGame(init);
			game.save();
		}
	}

	function newGame() {
		var game = active.game;

		clearDOM();
		game.cleanup();
		game.newGame();
	}

	function exportAPI() {
		Y.Solitaire.Application = {
			windowHeight: 0,
			resizeEvent: "resize",
			GameChooser: GameChooser,
			newGame: newGame
		};
	}

        function hideChromeStoreLink() {
		var expires = 1000 * 3600 * 24 * 365; // one year

		Y.one(".chromestore").addClass("hidden");
		Y.Cookie.set("disable-chromestore-link", true, {expires: new Date(new Date().getTime() + expires)});
        }

	function showChromeStoreLink() {
		if (Y.UA.chrome && !Y.Cookie.get("disable-chromestore-link", Boolean)) {
			Y.one(".chromestore").removeClass("hidden");
		}
	}

	var Preloader = {
		loadingCount: 0,

		loaded: function (callback) {
			if (this.loadingCount) {
				setTimeout(function () {
					this.loaded(callback);
				}.bind(this), 100);
			} else {
				Y.one(".loading").addClass("hidden");
				callback();
				Fade.hide();
			}
		},
	
		load: function (path) {
			var image = new Image;

			image.onload = function () {
				--this.loadingCount;
			}.bind(this);
			image.src = path;

			this.loadingCount++;
		},

		preload: function () {
			    var rank,
			    icons = ["agnes",
			    	     "flower-garden",
				     "forty-thieves",
				     "freecell",
				     "gclock",
				     "golf",
				     "klondike1t",
				     "klondike",
				     "montecarlo",
				     "pyramid",
				     "scorpion",
				     "spider1s",
				     "spider2s",
				     "spiderette",
				     "spider",
				     "tritowers",
				     "will-o-the-wisp",
				     "yukon"];

			Y.Array.each(["s", "h", "c", "d"], function (suit) {
				for (rank = 1; rank <= 13; rank++) {
					this.load(Y.Solitaire.Card.base.theme + "/" + suit + rank + ".png");
				}
			}, this);

			this.load(Y.Solitaire.Card.base.theme + "/facedown.png");

			Y.Array.each(icons, function (image) {
				this.load("layouts/mini/" + image + ".png");
			}, this);

			Fade.show();
			Y.one(".loading").removeClass("hidden");
		}
	};

	yui.use.apply(yui, modules().concat(main));
}());
