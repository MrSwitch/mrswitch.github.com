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
// CopyRight Andrew Dodson, March 2013
//
(function colorFlood(){

	if(!("getContext" in document.createElement('canvas'))){
		// browser doesn't support canvas
		return;
	}

	var c, ctx;

	document.documentElement.style.cssText = [
		'background-color:white',
		'background-size:100%',
		'background-position: top left',
		'background-attachment: fixed'
	].join(';');


	if("getCSSCanvasContext" in document){

		document.documentElement.style.cssText = [
			'background-color:white',
			'background-image: -webkit-canvas(colorflood)',
			'background-position: top left',
			'background-attachment: fixed'
		].join(';');

		c = {
			width:window.innerWidth,
			height:window.innerHeight
		};

		ctx = document.getCSSCanvasContext("2d", "colorflood", c.width, c.height);

	}
	else {
		c = document.createElement('canvas');
		document.body.insertBefore(c,document.body.firstElementChild);
		c.width=window.innerWidth;
		c.height=window.innerHeight;
		c.style.cssText = "position:fixed;z-index:-1;top:0;left:0;";
		ctx = c.getContext('2d');
	}

	var clicks = 0,
		flooded = 1,
		selectedColor = null,
		tiles = [];


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
	 *  Build Canvas Object Collection
	 * * Tiles
	 * * Data
	 ******************************************/

	collection = [];

	// set tile default Width and height
	var h,w;
	w = h = 50;

	// set number of tiles horizontally and vertically
	var nx = Math.floor(c.width/w);
	var ny = Math.floor(c.height/h);

	// Do the tiles not perfectly fit the space?
	// split the difference between the tiles, adding to the widths and heights
	w += parseInt((c.width%(nx*w))/nx,10);
	h += parseInt((c.height%(ny*h))/ny,10);


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
	selectedTile(0,0);


	// Add a text Object
	// We only have one text Object on the screen at a time, lets reuse it.
	var text = new TextObject();
	text.write("Flood It", "center center", 150);


	/******************************************
	 *
	 *  Add Events
	 *
	 ******************************************/

	// Add events
	var doc = document.documentElement;
	doc.addEventListener('mousedown', function(e){
		selectedTile(e.clientX,e.clientY);
	}, false);

	doc.addEventListener('touchdown', function(e){
		selectedTile(e.touches[0].clientX,e.touches[0].clientY);
	}, false);

/*
	function userPlay(x,y){
		selectedTile(x,y);
	}


	(function automate(){
		if(!clicks){
			selectedTile(Math.random()*c.width,Math.random()*c.height);
			setTimeout(automate,1000);
		}
	})();
*/

	function selectedTile(x,y){

		var i = Math.floor(x/w,10),
			j = Math.floor(y/h,10);

		var tile = tiles[(nx * j) + i];
		selectedColor = tile.color;

		// Trigger Flooding
		for(var k=0;k<tiles.length;k++){

			tile = tiles[k];

			if(tile.flooded){
				flood(tile);
			}
		}

		// Has the game state changed?
		if(flooded>=(nx*ny)){
			text.write("Game finished in " + clicks + " moves", "center center", 150);
		}
		else{
			if(clicks++){
				text.write(clicks, "right bottom", 50);
			} else if(!clicks){
				text.write("Flood It", "center center", 150);
			}
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
		var edgeTiles = [((y-1)*nx)+x, (y*nx)+x+1, ((y+1)*nx)+x, (y*nx)+x-1];

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
		if(document.body&&window.getComputedStyle&&(parseInt(getComputedStyle(document.body).width,10)+50)<window.innerWidth){

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
		CanvasShape.apply(this, [null,null,null,null]);

		// Define the text and the alignment of the object
		this.write = function(text, align, fontSize){

			var ctx = this.ctx,
				canvas = this.canvas;

			// Mark this item and items in the same space for a redrawn
			// Clear the space that the item currently occupies
			this.touch();


			// Find the width and height of the item
			// Using the canvas context
			ctx.save();

			ctx.shadowColor = "black";
			ctx.shadowBlur = 10;
			ctx.fillStyle="black";
			ctx.strokeStyle="rgba(255,255,255,0.5)";
			ctx.font= fontSize + "px Arial bold";

			while(ctx.measureText(text).width>canvas.width){
				fontSize -= 10;
				ctx.font= fontSize + "px Arial bold";
			}
			this.font = ctx.font;

			this.w = ctx.measureText(text).width + (ctx.shadowBlur*2);
			this.h = fontSize + (ctx.shadowBlur*2);

			ctx.restore();

			// Store style attributes
			// Store the new attributes of the text item
			this.text = text;

			this.textAlign=align.split(" ")[0];
			this.textBaseline=align.split(" ")[1];
			this.lineWidth=fontSize/20;


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
			ctx.shadowBlur = 10;
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