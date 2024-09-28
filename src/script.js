// Script
// This script controls the background page
import getScript from 'tricks/browser/http/getScript.js';
import el from 'tricks/dom/create.js';

const name = (function () {
	const a = ['mineField', 'tiledOfLife', 'colorFlood', 'tetris'];
	return a[Math.floor(Math.random() * a.length)] || a[0];
})();

getScript(`/background/dist/${name}.js`);

// Install background
self.background = self.background || [];

let bg;

// Push a function to call
self.background.push(BG => {
	// Passing in null for target inserts it into the body background
	bg = BG.init(null);

	// Setup, without any controls
	if (bg.setup) {
		// Set default state
		bg.setup({
			controls: false,
		});
	}

	// Is this a configurable background?
	if (bg.config) {
		// Create a controller to listen to toggling between states
		window.addEventListener('hashchange', hashchange);
		hashchange();

		// Show the controls
		el('div', {
			class: 'controls'
		}, [
			el('a', {
				id: 'play_btn',
				href: '#background',
				onclick(e) {
					e.stopPropagation();
				}
			}, ['Play'])
		], document.body);
	}
});

// Listen to the background trigger to show/hide the background
function hashchange() {
	// Has the backdrop come into the focus?
	const controls = window.location.hash === '#background';

	// Add/Remove class from window
	window.document.documentElement.classList[controls ? 'add' : 'remove'](
		'background'
	);

	bg.config({controls});
}

// Fix ios scrolling issue
document.addEventListener(
	'touchmove',
	event => {
		event.preventDefault();
	},
	false
);
