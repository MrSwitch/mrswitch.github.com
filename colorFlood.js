// requestAnimationFrame polyfill, paul_irish
window.requestAnimationFrame = (function(){
	return  window.requestAnimationFrame       ||
		window.webkitRequestAnimationFrame ||
		window.mozRequestAnimationFrame    ||
		window.oRequestAnimationFrame      ||
		window.msRequestAnimationFrame     ||
		function( callback ){
			window.setTimeout(callback, 1000 / 60);
		};
})();


//
// ColorFlood, Canvas annimation
// Copyright Andrew Dodson, March 2013
//
(function colorFlood(){

	if(!("getContext" in document.createElement('canvas'))){
		// browser doesn't support canvas
		return;
	}

	var canvas;
	var c, ctx;


	c = document.createElement('canvas');
	canvas = c;
	document.body.insertBefore(c,document.body.firstElementChild);
	c.width=window.innerWidth;
	c.height=window.innerHeight;
	c.style.cssText = "position:fixed;z-index:-1;top:0;left:0;";
	c.setAttribute('tabindex',0);
	ctx = c.getContext('2d');


	var clicks,
		flooded,
		selectedColor;

	/******************************************
	 *
	 *  Define Canvas dimensions
	 *
	 ******************************************/

	// ensure its keeping up.
	c.width=window.innerWidth;
	c.height=window.innerHeight;


	/******************************************
	 *
	 *  Add event to the document to toggle display
	 *
	 ******************************************/

	function togglePlay(){
		window.location.hash = (window.location.hash === "#escape" ? '' : 'escape');
	}

	var fullscreen = false;
	function hashchange(){
		fullscreen = (window.location.hash === "#escape");

		if(!fullscreen){
			document.body.style.position = "static";
			document.body.style.left = "0";
		}else{
			document.body.style.webkitTransition = "left 1s";
			document.body.style.mozTransition = "left 1s";
			document.body.style.msTransition = "left 1s";
			document.body.style.transition = "left 1s";
			document.body.style.position = "absolute";
			document.body.style.left = "-3000px";
		}
	}

	window.addEventListener('hashchange', hashchange,false);
	hashchange();


	// Press ESC
	// Add this to the canvas
	canvas.addEventListener('keydown', function(e){
		if(e.target!==canvas){
			return;
		}
		// Has the user has pressed escape
		// Lets bring back the body
		if(e.keyCode===27){
			togglePlay();
		}

	}, false);




	/******************************************
	 *
	 *  Build Canvas Object Collection
	 * * Tiles
	 * * Data
	 ******************************************/

	var collection = [],
		tiles = [];


	var h,w;
	var nx;
	var ny;


	// Setup all the tiles
	setup(true);

	// Add a text Object
	// We only have one text Object on the screen at a time, lets reuse it.
	var	text = new TextObject();
	text.write("Flood It", "center center", 150);
	text.touch(true);

	// Help
	var	info = new TextObject();
	info.write("Start in the top left corner\nFlood tiles by color\nIn as few moves as possible", "center center", 40);
	info.y = text.y + text.h;
	info.touch(true);


	// Is this playing as a background image?
	// We want to display a button to enable playing in full screen.
	var play = new TextObject();
	play.write("►", "left top", 40);
	play.addEventListener('mousedown', function(e){

		if(window.location.hash.match(/#escape/)){
			text.write("Flood It", "center center", 150);
			info.visible = true;
			info.touch();
			setup();
		}
		else{
			togglePlay();
		}

		e.preventDefault();

	},false);



	/******************************************
	 *
	 *  Add Events, to listen to in game play
	 *
	 ******************************************/

	canvas.addEventListener('mousedown', function(e){
		console.log(e.target);
		if(e.target!==canvas||e.clientX>(e.target.clientWidth+e.target.clientLeft)){
			return;
		}
		e.preventDefault();
		gamePlay(e.clientX,e.clientY);
		triggerEvent(e);
	}, false);

	canvas.addEventListener('touchstart', function(e){
		var x = e.touches[0].clientX,
			y = e.touches[0].clientY;

		if(e.target!==canvas|| x > e.target.clientX>(e.target.clientWidth+e.target.clientLeft)){
			return;
		}
		e.preventDefault();
		gamePlay(x,y);
		triggerEvent(e);
	}, false);


	function triggerEvent(e){
		//
		// Using the XY cords lets see which elements intersect at that position
		var obj = {
			x: e.clientX,
			y: e.clientY,
			w: 1,
			h: 1
		};
		for(var i=0;i<collection.length;i++){
			// Does the element have any event listeners?
			if((e.type in collection[i].events) && intersect(obj,collection[i]) ){
				collection[i].dispatchEvent(e);
			}
		}
	}


/*
	function userPlay(x,y){
		selectedTile(x,y);
	}


	(function automate(){
		if(!clicks){
			selectedTile(Math.random()*c.width,Math.random()*c.height);
			setTimeout(automate, 1000);
		}
	})();
*/

	function setup(firsttime){

		clicks = 0;
		flooded = 1;
		selectedColor = null;

		tiles.length = 0;
		collection.length = 0;


		// Define type size
		// set tile default Width and height
		w = h = 50;

		// set number of tiles horizontally and vertically
		nx = Math.floor(c.width/w);
		ny = Math.floor(c.height/h);

		// Do the tiles not perfectly fit the space?
		// split the difference between the tiles, adding to the widths and heights
		w += Math.floor((c.width%(nx*w))/nx);
		h += Math.floor((c.height%(ny*h))/ny);

		// Create tiles
		for(var y=0;y<ny;y++){
			for(var x=0;x<nx;x++){

				var tile = new Tile(x*w,y*h,w-1,h-1);
				tiles.push(tile);
				tile.gridX = x;
				tile.gridY = y;
			}
		}


		// Starting state
		// Select the first tile, (top left corner)
		// Mark as flooded
		tiles[0].flooded = true;

		// Flood its neighbouring tiles on start
		tileClick(0,0);

		if(!firsttime){
			collection.push(text);
			collection.push(info);
			collection.push(play);
			text.touched = true;
			info.touched = true;
			play.touched = true;
		}
	}


	function tileClick(x,y){
		var i = Math.floor(x/w,10),
			j = Math.floor(y/h,10);

		var tile = tiles[(nx * j) + i];
		if(!tile){
			return;
		}

		selectedColor = tile.color;

		// Trigger Flooding
		for(var k=0;k<tiles.length;k++){

			tile = tiles[k];

			if(tile.flooded){
				flood(tile);
			}
		}
	}

	function gamePlay(x,y){

		// Tile Clicked
		tileClick(x,y);

		// Has the game state changed?
		if(flooded>=(nx*ny)&&clicks<(nx+ny)){
			text.write("Kudos! " + (clicks+1) + " moves", "center center", 150);
			info.visible = false;
			info.touched = true;
		}
		else if(++clicks>=(nx+ny)){
			text.write("Game over!", "center center", 150);
			info.visible = true;
			info.touched = true;
		}
		else{
			text.write(clicks + "/" + (nx+ny), "right bottom", 50);
			info.visible = false;
			info.touched = true;
		}
	}


	//
	// Flood this tile with the new colour and its neighbours with the same colour
	function flood(tile){

		var x = tile.gridX,
			y = tile.gridY;

		tile.color = selectedColor;
		// Not sure how optimal this is but hey it look
		tile.touch();
		// find all tiles next to this one.
		var edgeTiles = [(Math.max(y-1,0)*nx)+x, (y*nx)+Math.min(x+1,nx-1), ((Math.min(y+1,ny-1))*nx)+x, (y*nx)+Math.max(x-1,0)];

		for(var k=0;k<edgeTiles.length;k++){
			if(edgeTiles[k]>0&&tiles[edgeTiles[k]]){
				if(tiles[edgeTiles[k]].color === selectedColor && !tiles[edgeTiles[k]].flooded){
					tiles[edgeTiles[k]].flooded = true;
					flood(tiles[edgeTiles[k]]);
					flooded++;
				}
			}
		}
	}



	/******************************************
	 *
	 *  Animation loop
	 *
	 ******************************************/

	var time = (new Date()).getTime(),
		fps=0;


	(function animation(){

		fps++;
		if(((new Date()).getTime()-time)>1000){
			console.log("FPS:"+fps);
			time = (new Date()).getTime();
			fps=0;
		}

		// Check that the background is shown
		if(fullscreen || (document.body&&window.getComputedStyle&&(parseInt(getComputedStyle(document.body).width,10)+50)<window.innerWidth)){

			// Find items that have changed
			// Remove background
			for(var i=0;i<collection.length;i++){

				var tile = collection[i];
				if(tile.touched){
					if(tile.visible){
						tile.draw();
					}
					tile.touched = false;
				}
			}
		}

		requestAnimationFrame(animation);
	})();




	/******************************************
	 *
	 *  Canvas Shapes
	 *
	 ******************************************/


	// CanvasShapes
	// The parent object defining a basic shape, x,y,w,h, for starters.
	// And basic operatings you might like to include on a shape
	function CanvasShape(x,y,w,h){

		// Assign, rectangle shape
		this.x = x;
		this.y = y;
		this.w = w;
		this.h = h;
		this.ctx = ctx;
		this.canvas = c;

		this.visible = true;

		// The default status is touched,
		// This means it needs to be drawn on to canvas
		this.touched = true;

		// Remove
		// Find all objects that intersect and mark them
		// Do not redraw this item
		this.remove = function(){

			// Clean up this elements shared space
			this.touch();

			// Unmark this item from being redrawn
			this.touched = false;
		};


		// Touch
		// Mark items and objects in the same space to be redrawn
		this.touch = function(){

			// Mark the item for a redraw
			this.touched = true;

			// Check that this has been created
			if(!(this.w&&this.h)){
				// This has no dimensions
				return;
			}

			// Remove from Canvas
			ctx.clearRect ( this.x , this.y, this.w, this.h );

			// Loop though objects and redraw those that exist within the position
			for(var i=0;i<collection.length;i++){
				var obj = collection[i];
				// Does this Object overlap with the current object?
				if(!obj.touched&&intersect(obj,this)){
					// Mark the other element, so it gets redrawn
					obj.touch();
				}
			}
		};

		// Events
		// Assign Events to be fired when the user clicks this object
		// Awesome
		this.events = {};
		this.addEventListener = function(eventName, callback){
			if(!(eventName in this.events)){
				this.events[eventName] = [];
			}
			this.events[eventName].push(callback);
		};

		this.dispatchEvent = function(e){
			if(!(e.type in this.events)){
				return;
			}
			var a = this.events[e.type];
			for(var i=0;i<a.length;i++){
				a[i](e);
			}
		};


		// Collect
		// Add to the collection
		collection.push(this);
	}

	// Intersect
	// Given two objects with, x,y,w,h properties
	// Do their rectangular dimensions intersect?
	// return Boolean true false.
	function intersect(a,b){
		return !( a.x>(b.x+b.w) ||
		(a.x+a.w)<b.x  ||
		a.y>(b.y+b.h) ||
		(a.y+a.h)<b.y );
	}


	//
	// Create a new tile
	// Arguments handled by parent
	function Tile(x,y,w,h){

		// Parent Object
		CanvasShape.apply(this, arguments);

		// Update
		var palate = ["red","green","orange","blue","white","black"];
		var index = Math.floor(Math.random()*palate.length);
		if(index===palate.length){
			index--;
		}

		this.gridX = 0;
		this.gridY = 0;

		this.color = palate[index];

		this.flooded = false; // is this tile caught

		this.fill = function(){
			this.ctx.fillStyle = this.color;
			this.ctx.fillRect(this.x+1,this.y+1,this.w-1,this.h-1);
		};

		this.draw = function(){
			this.fill();
		};
	}


	//
	// TextObject, defines a shape object which contains text.
	function TextObject(){

		// Parent Object
		// iniially we dont know the shape of the text until we apply content too it.
		CanvasShape.apply(this);

		// Define the text and the alignment of the object
		this.write = function(text, align, fontSize){

			var ctx = this.ctx,
				canvas = this.canvas;

			// Mark this item and items in the same space for a redrawn
			// Clear the space that the item currently occupies
			this.touch();

			// Split text by line breaks
			this.lines = text.split('\n');

			// Which is the longest line?
			var _width = 0, default_text = this.lines[0];
			for(var i=0;i<this.lines.length;i++){
				var _w = ctx.measureText(this.lines[i]).width;
				if(_w>_width){
					_width = _w;
					default_text = this.lines[i];
				}
			}


			// Find the width and height of the item
			// Using the canvas context
			ctx.save();

			ctx.shadowColor = "black";
			ctx.fillStyle="black";
			ctx.strokeStyle="rgba(255,255,255,0.5)";
			ctx.font= fontSize + "px Arial bold";

			while(ctx.measureText(default_text).width>canvas.width){
				fontSize *= 0.9;
				fontSize = Math.round(fontSize);
				ctx.font = fontSize + "px Arial bold";
			}
			this.shadowBlur = ctx.shadowBlur = Math.round(fontSize/10);
			this.font = ctx.font;

			this.w = ctx.measureText(default_text).width + (this.shadowBlur*2);
			this.h = (fontSize + (this.shadowBlur*2))*this.lines.length;

			ctx.restore();

			// Store style attributes
			// Store the new attributes of the text item
			this.text = text;

			this.textAlign=align.split(" ")[0];
			this.textBaseline=align.split(" ")[1];
			this.lineWidth=Math.floor(fontSize/30);


			// HEIGHT and WIDTH
			switch(this.textAlign){
				case "center":
				case "middle":
					this.textAlign="center";
					this.x = (c.width/2) - (this.w/2);
				break;
				case "left":
					this.x = 0;
				break;
				case "right":
					this.x = c.width - this.w;
				break;
			}

			switch(this.textBaseline){
				case "center":
				case "middle":
					this.textBaseline="middle";
					this.y = (c.height/2) - (this.h/2);
				break;
				case "top":
					this.y = 0;
				break;
				case "bottom":
					this.y = c.height - this.h;
				break;
			}

			// Mark that it needs to be redrawn
			this.touch();
		};

		this.draw = function(){

			ctx.save();

			ctx.shadowColor = "black";
			ctx.shadowBlur = this.shadowBlur;
			ctx.fillStyle="black";
			ctx.strokeStyle="white";
			ctx.font = this.font;

			ctx.textAlign = 'left';
			ctx.textBaseline = 'top';
			ctx.lineWidth = this.lineWidth;

			for(var i=0,len=this.lines.length;i<len;i++){
				ctx.fillText(this.lines[i], this.x, this.y + (i*(this.h/len)) );
				ctx.strokeText(this.lines[i], this.x, this.y + (i*(this.h/len)) );
			}
			ctx.restore();
		};
	}


})();


//
// Add Event Listener to recreate the canvas on resize...
/*
if(window.addEventListener){

	window.addEventListener('resize', function(){

		if(c.width!==window.innerWidth||c.height!==window.innerHeight){

			// ensure its keeping up.
			c.width=window.innerWidth;
			c.height=window.innerHeight;

			if(!(c instanceof HTMLCanvasElement)){
				ctx = document.getCSSCanvasContext("2d", "sunrise", c.width, c.height);
			}
		}

	});

}
*/