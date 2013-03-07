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
// Sunrise, Canvas annimation
//
// CopyRight Andrew Dodson, 2012
//
(function sunrise(){

	if(!("getContext" in document.createElement('canvas'))){
		// browser doesn't support canvas
		return;
	}

	var radius = 500, ctx, c, opacity = 0;

	if("getCSSCanvasContext" in document){
		ctx = document.getCSSCanvasContext("2d", "sunrise", radius*2, radius*2);

		document.documentElement.style.cssText = 'background-image: -webkit-canvas(sunrise);'+
		'background-position: center center;'+
		'background-repeat: no-repeat no-repeat;background-size:150% 150%;';

		ctx.globalAlpha = 0;
	}
	else {
		radius = screen.width/2;
		c = document.createElement('canvas');
		document.body.appendChild(c);
		c.width=screen.width;
		c.height=screen.height;
		c.style.cssText = "position:fixed;z-index:-1;top:0;left:0;";
		c.style.opacity = 0;
		ctx = c.getContext('2d');
	}

	// Add custom styles
	var style = document.createElement('style');
//	style.innerText = style.innerHTML = "html.animating *:not(canvas){-webkit-transform: rotate(360deg);-webkit-transition:all 10s;-moz-transform: rotate(360deg);-moz-transition:all 10s;-ms-transform: rotate(360deg);-ms-transition:all 10s;transform: rotate(360deg);transition:all 10s;background-color:rgba(0,0,0,0.1)}";
	style.innerText = style.innerHTML = "html.animating *:not(canvas){background-color:rgba(0,0,0,0.1)}";
	document.body.appendChild(style);


	// Add events

	var hover = false;

	var img = document.getElementsByTagName('img')[0];
	img.addEventListener('mouseover', function(e){
		hover = true;
		e.stopPropagation();
	}, false);
	img.addEventListener('touchdown', function(e){
		e.stopPropagation();
		hover = !hover;
	}, false);
	img.addEventListener('mouseout', function(){
		hover = false;
	}, false);

	var start = 0;

	function visibility(i){

		opacity += i;

		opacity = Math.round(opacity*10)/10;

		if("globalAlpha" in ctx){
			// calling globalAlpha in Chrome too many times crashes... interesting
			ctx.globalAlpha = opacity;
		}
		if(c){
			c.style.opacity = opacity;
		}
	}

	function animation(){

		if(c){
			// ensure its keeping up.
			radius = screen.width/2;
			c.width=screen.width;
			c.height=screen.height;
		}

		// Update document.
		window.document.documentElement.className = hover ? "animating" : "";

		// Do we need this?
		//
		if(hover||opacity>0){

			start++;

			if(hover&&opacity<1){
				visibility(0.1);
			}
			if(!hover&&opacity>0){
				visibility(-0.1);
			}

			var slices = 32;
			
			ctx.clearRect ( 0 , 0 , radius*2 , radius*2 );

			// draw an arc
			var pallate = ['rgb(255, 140, 0)', 'rgb(255,0,0)', 'rgb(255,255,0)'];
			for(var i=0;i<slices;i++){
				ctx.beginPath();
				ctx.fillStyle=pallate[i%pallate.length];
				// *270 changed to *360
				ctx.arc(radius,radius,radius*1.5,(Math.PI/180)*((i*(360/slices))+start),(Math.PI/180)*(((i+1)*(360/slices))+start),false);
				ctx.lineTo(radius, radius);
				ctx.fill();
				ctx.closePath();
			}
		}
		requestAnimationFrame(animation);
	}
	animation();
})();
