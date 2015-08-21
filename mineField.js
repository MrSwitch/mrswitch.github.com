// Encoding: UTF-8

// requestAnimationFrame polyfill
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
// mineField, Canvas annimation
// Copyright Andrew Dodson, March 2013
//
(function mineField(){

	if(!("getContext" in document.createElement('canvas'))){
		// browser doesn't support canvas
		return;
	}

	var canvas, fullscreen=true;
	var c, ctx;

	c = document.getElementById('escape');
	// ensure its keeping up.
	c.width=c.parentNode.offsetWidth;
	c.height=c.parentNode.offsetHeight;

	c.style.cssText = "position:absolute;top:0;left:0;bottom:0;right:0;";
	c.setAttribute('tabindex',0);
	ctx = c.getContext('2d');
	canvas = c;

	/******************************************
	 *
	 *  Define Canvas dimensions
	 *
	 ******************************************/

	function scaleCanvas (){
		// ensure its keeping up.
		c.width=c.parentNode.offsetWidth;
		c.height=c.parentNode.offsetHeight;
	}

	scaleCanvas();

	window.addEventListener('resize', function(){
		scaleCanvas();
		setup();
	});



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

	var mines = [],
		flooded = 0,
		boom = false;

	var h,w;
	var nx;
	var ny;


	// Setup all the tiles
	setup(true);

	// Add a text Object
	// We only have one text Object on the screen at a time, lets reuse it.
	var	text = new TextObject();
	text.write("MineField", "center center", 150);


	// Is this playing as a background image?
	// We want to display a button to enable playing in full screen.
	var play = new TextObject();
	play.write("►", "left top", 40);
	play.addEventListener('mousedown', function(e){

		text.write("MineField");
		setup();
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

		mines = [];
		flooded = 0;
		boom = false;

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

				// Upgrade the number of mines
				if(tile.mine){
					mines.push(tile);
				}
			}
		}

		// Flood its neighbouring tiles on start
		if(!firsttime){
			collection.push(text);
			collection.push(play);
			text.touched = true;
			play.touched = true;
		}
	}


	function tileClick(x,y){
		var i = Math.floor(x/w,10),
			j = Math.floor(y/h,10);

		var tile = tiles[(nx * j) + i];

		if(!tile){
			return true;
		}

		// If this is the first time the game has been played, 
		// flooded will equal 0
		if(flooded===0){
			// Ensure this is not a mine
			tile.mine = false;
		}


		// Trigger Flooding
		// Check to see it this tile has been exposed before?
		if(tile.visible){
			// Dont do anything
			return true;
		}
		else if(tile.mine){
			return false;
		}
		else{
			// Make visible
			flood(tile);
			return true;
		}
	}

	function gamePlay(x,y){

		if(!boom){
			boom = !tileClick(x,y);
		}

		if( (flooded+mines.length)===(nx*ny) || boom ){

			// Show all the mines
			for(var i=0;i<mines.length;i++){
				mines[i].visible = true;
				mines[i].touch();
			}

			text.write( boom ? "BOOM!": "Kudos!" , "center center", 150);
		}
		else {
			text.write("", "right bottom", 50);
		}
	}


	//
	// Flood this tile with the new colour and its neighbours with the same colour
	function flood(tile){

		var x = tile.gridX,
			y = tile.gridY;

		if(tile.visible){
			return;
		}

		// Add to Counter
		flooded++;

		// Mark as visible
		tile.visible = true;

		// Mark the tile as changed
		tile.touch();

		// find all tiles around this one.
		// Filter the array so we only have unique values
		var edgeTiles = unique([
			(Math.max(y-1,0)*nx)+Math.max(x-1,0), 
			(Math.max(y-1,0)*nx)+x, 
			(Math.max(y-1,0)*nx)+Math.min(x+1,nx-1), 
			(y*nx)+Math.min(x+1,nx-1), 
			((Math.min(y+1,ny-1))*nx)+Math.min(x+1,nx-1),
			((Math.min(y+1,ny-1))*nx)+x,
			((Math.min(y+1,ny-1))*nx)+Math.max(x-1,0),
			(y*nx)+Math.max(x-1,0)
		]);

		// Any bombs nearby?
		// Find the `heat` of the current node
		// Loop through all the tiles surrouding this point
		tile.heat = 0;

		for(var k=0;k<edgeTiles.length;k++){
			if(tiles[edgeTiles[k]].mine){
				tile.heat++;
			}
		}

		// If this tile is the one selected, 
		// And has no heat, then recurse through all neighbours and flood them no heat
		if(tile.heat===0){
			for(var k=0;k<edgeTiles.length;k++){
				flood(tiles[edgeTiles[k]]);
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
					tile.draw();
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

		// Mine?
		// Assign with a 1 in 5 chance
		this.mine = Math.random()<(1/8);

		this.gridX = 0;
		this.gridY = 0;

		this.visible = false;

		this.heat = 0; // How many bombs are next to this?

		this.fill = function(){

			ctx.save();

			this.ctx.fillStyle = this.visible?(this.mine?"red":"#eee"):"#ccc";

			this.ctx.fillRect(this.x+1,this.y+1,this.w-1,this.h-1);


			// Can't make this visible
			if( this.heat ){

				ctx.textBaseline = "middle";
				ctx.textAlign = "center";
				ctx.fillStyle="black";
				ctx.font = "30px Arial bold";


				ctx.fillText(this.heat, this.x+(this.w/2), this.y+(this.h/2) );
				ctx.strokeText(this.heat, this.x+(this.w/2), this.y+(this.h/2) );
			}
			ctx.restore();
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

			if (align) {
				this.align = align;
			}
			if (fontSize) {
				this.fontSize = fontSize;
			}


			// Find the width and height of the item
			// Using the canvas context
			ctx.save();

			ctx.shadowColor = "black";
			ctx.fillStyle="black";
			ctx.strokeStyle="rgba(255,255,255,0.5)";
			ctx.font= this.fontSize + "px Arial bold";

			while(ctx.measureText(text).width>canvas.width){
				fontSize *= 0.9;
				fontSize = Math.round(this.fontSize);
				ctx.font = this.fontSize + "px Arial bold";
			}

			this.shadowBlur = ctx.shadowBlur = Math.round(this.fontSize/10);
			this.font = ctx.font;

			this.w = ctx.measureText(text).width + (this.shadowBlur*2);
			this.h = this.fontSize + (this.shadowBlur*2);

			ctx.restore();

			// Store style attributes
			// Store the new attributes of the text item
			this.text = text;

			this.textAlign=this.align.split(" ")[0];
			this.textBaseline=this.align.split(" ")[1];
			this.lineWidth=Math.floor(this.fontSize/30);


			// HEIGHT and WIDTH
			switch(this.textAlign){
				case "center":
				case "middle":
					this.textAlign="center";
					this.alignX = c.width/2;
					this.x = (c.width/2) - (this.w/2);
				break;
				case "left":
					this.alignX = 0;
					this.x = 0;
				break;
				case "right":
					this.alignX = c.width;
					this.x = c.width - this.w;
				break;
			}

			switch(this.textBaseline){
				case "center":
				case "middle":
					this.textBaseline="middle";
					this.alignY = c.height/2;
					this.y = (c.height/2) - (this.h/2);
				break;
				case "top":
					this.alignY = 0;
					this.y = 0;
				break;
				case "bottom":
					this.alignY = c.height;
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

			ctx.textAlign = this.textAlign;
			ctx.textBaseline = this.textBaseline;
			ctx.lineWidth = this.lineWidth;

			ctx.fillText(this.text, this.alignX, this.alignY );
			ctx.strokeText(this.text, this.alignX, this.alignY );
			ctx.restore();
		};
	}



	function unique (arr){

		var o = {}, a = [];
		for (var i = 0; i < arr.length; i++) {o[arr[i]] = 1;}
		for (var e in o) {a.push(e);}
		return a;
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