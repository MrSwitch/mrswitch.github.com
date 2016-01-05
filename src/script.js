// Script
// This script controls the background page
(function(window) {

// Load the background script
var script = document.createElement("script");
script.src = '/background/dist/' + (function() {
	var a = ["mineField", "tiledOfLife", "colorFlood"];
	return a[Math.floor(Math.random() * a.length)] || a[0];
})() + '.js';
document.body.appendChild(script);

// Install background
window.background = window.background || [];
var bg;

// Push a function to call
background.push(function(BG) {
	// Passing in null for target inserts it into the body background
	bg = BG.init(null);

	// Setup, without any controls
	if (bg.setup) {

		// Set default state
		bg.setup({
			controls: false
		});
	}

	// Is this a configurable background?
	if (bg.config) {

		// Create a controller to listen to toggling between states
		window.addEventListener('hashchange', hashchange);
		hashchange();

		// Show the controls
		var a = document.createElement('a');
		a.href = "#background";
		a.id = "play_btn"; // jerky jank prevention
		a.innerHTML = "Play";
		a.onclick = function(e) {
			e.stopPropagation();
		};
		document.body.appendChild(a);
	}
});


// Listen to the background trigger to show/hide the background
function hashchange() {

	// Has the backdrop come into the focus?
	var bool = (window.location.hash === '#background');

	// Add/Remove class from window
	window.document.documentElement.classList[bool ? 'add' : 'remove']('background');

	bg.config({
		controls: bool
	});
};

// Fix ios scrolling issue
document.addEventListener('touchmove', function (event) {
    event.preventDefault();
}, false);

})(window);
