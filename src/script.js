// Script
// This script controls the background page

// Load the background script
var script = document.createElement("script");
script.src = '/background/dist/' + (function() {
	var a = ["mineField", "tiledOfLife", "colorFlood"];
	return a[Math.floor(Math.random() * a.length)] || a[0];
})() + '.js';
document.body.appendChild(script);

// Install background
var background = window.background || [];
var bg;

// Push a function to call
background.push(function(BG) {
	// Passing in null for target inserts it into the body background
	bg = BG.init(null);

	// Setup, without any controls
	if (bg.setup) {

		// Show the controls
		var a = document.createElement('a');
		a.href = "#background";
		a.style.position = "absolute"; // jerky jank prevention
		a.innerHTML = "Play";
		a.onclick = function(e) {
			e.stopPropagation();
		};
		document.getElementsByTagName('footer')[0].appendChild(a);

		// Set default state
		bg.setup({
			controls: false
		});
	}
});

// Listen to the background trigger to show/hide the background
function hashchange() {

	// Has the backdrop come into the focus?
	var bool = (window.location.hash === '#background');

	// Add/Remove class from window
	window.document.documentElement.classList[bool ? 'add' : 'remove']('background');

	// Change the controls of the background animation
	background.push(function() {
		bg.config({
			controls: bool
		});
	});
};

window.addEventListener('hashchange', hashchange);

hashchange();
