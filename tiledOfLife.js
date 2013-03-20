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
// TILED OF LIFE, Canvas annimation
//
// CopyRight Andrew Dodson, March 2013
//
(function tiledOfLife(){

	if(!("getContext" in document.createElement('canvas'))){
		// browser doesn't support canvas
		return;
	}

	var radius = 500, c, ctx;

	document.documentElement.style.cssText = [
		'background-color:white',
//		'background-image: url(../graffiti/assets/gorgeous.jpg)',
		'background-size:100%',
		'background-position: top left',
		'background-attachment: fixed'
	].join(';');


	if("getCSSCanvasContext" in document){

		document.documentElement.style.cssText = [
			'background-color:white',
			'background-image: -webkit-canvas(sunrise)',
			'background-position: top left',
			'background-attachment: fixed'
		].join(';');

		c = {
			width:0,
			height:0
		};
	}
	else {
		radius = screen.width/2;
		c = document.createElement('canvas');
		document.body.insertBefore(c,document.body.firstElementChild);
		c.width=screen.width;
		c.height=screen.height;
		c.style.cssText = "position:fixed;z-index:-1;top:0;left:0;";
		ctx = c.getContext('2d');
	}

	// Add events
	var doc = document.documentElement,
		mouse = null;
	doc.addEventListener('mousemove', function(e){
		mouse = e;
		e.stopPropagation();
	}, false);
	doc.addEventListener('touchmove', function(e){
		mouse = e;
		e.stopPropagation();
	}, false);

	var tiles = [];

	function animation(){

		if(c.width!==screen.width||c.height!==screen.height){

			// ensure its keeping up.
			c.width=screen.width;
			c.height=screen.height;

			if(!(c instanceof HTMLCanvasElement)){
				ctx = document.getCSSCanvasContext("2d", "sunrise", c.width, c.height);
			}
		}

		ctx.clearRect ( 0 , 0 , c.width, c.height );

		var radius = 50;

		// draw variant background
		var h,w;
		w = h = 20;
		var nx = Math.floor(c.width/w);
		var ny = Math.floor(c.height/h);
		for(var i=0;i<nx;i++){
			for(var j=0;j<ny;j++){

				var tile = tiles[((i*nx)+j)];

				// %100

				if(!tile){
					tile = new Tile();
					tiles.push(tile);
				}

//				console.log("rgba(0,0,0,"+tile.opacity()+")");
				// is the tile near the mouse

				if( mouse &&
					Math.abs(mouse.clientX-(i*w)) < radius &&
					Math.abs(mouse.clientY-(j*h)) < radius &&
					(Math.pow(mouse.clientX-(i*w),2)+Math.pow(mouse.clientY-(j*h),2) < Math.pow(radius,2) ) ){

					var dx = mouse.clientX-(i*w);
					var dy = mouse.clientY-(j*h);

					tile.translate(0.3 * (Math.abs(dx)/dx) * -( radius - Math.abs(dx) ),
									0.3 * (Math.abs(dy)/dy) * -( radius - Math.abs(dy) ) );
				}

				tile.x = (i*w) +1;
				tile.y = (j*h) +1;
				tile.w = w-1;
				tile.h = h-1;

				tile.draw(ctx);
				tile.getNew();
			}
		}

		requestAnimationFrame(animation);
	}

	// Create a new tile
	function Tile(){
		var n = 100;
		this.i = Math.round(Math.random()*n);
		this.dx = 0;
		this.dy = 0;
		this.translate = function(dx,dy){
			// sometimes we get a NaN, catch and set those
			if(!dx){
				dx = 0;
			}
			if(!dy){
				dy = 0;
			}
			this.dx += (dx-this.dx)*0.5;
			this.dy += (dy-this.dy)*0.5;
		};
		this.opacity = function(){
			return this.i?this.i/n:0;
		};
		this.ascending = !Math.round(Math.random());
		this.getNew = function(){

			if(this.i<=0){
				this.ascending = true;
			}
			else if(this.i>=n){
				this.ascending = false;
			}
			this.i += this.ascending?1:-1;
		};
		this.fill = function(ctx){
			ctx.fillStyle="rgba(0,0,0,"+this.opacity()+")";
			ctx.fillRect(this.x,this.y,this.w,this.h);
		};

		this.draw = function(ctx){
			if(this.dx||this.dy){
				ctx.save();
				ctx.translate(this.dx, this.dy);
				this.dy *= 0.9;
				this.dx *= 0.9;
				if(Math.abs(this.dx)<0.1){
					this.dx = 0;
				}
				if(Math.abs(this.dy)<0.1){
					this.dy = 0;
				}
				this.fill(ctx);
				ctx.restore();
			}
			else{
				this.fill(ctx);
			}
		};
	}

	animation();
})();