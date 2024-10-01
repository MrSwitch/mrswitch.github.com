// Script
// This script controls the background page
import el from 'tricks/dom/create.js';

// List of backgrounds
const backgroundList = ['colorFlood', 'mineField', 'tetris', 'tiledOfLife'];

// Preload the backgrounds
backgroundList.map(script => el("link", {
	href: `/background/dist/${script}.js`,
	rel: "preload",
	as: "script"
}, [], document.head));

// Pick a random background
let backgroundIndex = Math.floor(Math.random() * backgroundList.length);

let iframe;

/**
 * Load the background game
 */
function loadBackground(index) {
	const backgroundSelected = backgroundList.at(backgroundIndex%backgroundList.length);
	const srcdoc = `
<body>
<script src="/background/dist/${backgroundSelected}.js"></script>
<script>
// Install background
self.background = self.background || [];
</script>
`;
	if(iframe) {
		iframe.srcdoc = srcdoc;
		return iframe;
	}
	
	return el('iframe', {
		id: 'background',
		srcdoc
	}, [], document.body);
}

iframe = loadBackground(backgroundIndex);

let bg;

const iframeContextWindow = iframe.contentWindow;

iframe.addEventListener('load', () => {

	// Push a function to call
	iframeContextWindow.background.push(BG => {

		// First time?
		// Create the controls
		if (!bg) {
			el('div', {
				class: 'controls'
			}, [
				el('a', {
					id: 'prev_btn',
					text: '◀',
					click: (e) => {
						loadBackground(--backgroundIndex);
						e.stopPropagation();
					}
				}),
				el('a', {
					text: 'Play',
					id: 'play_btn',
					href: '#background',
					click: (e) => {
						e.stopPropagation();
					}
				}),
				el('a', {
					id: 'next_btn',
					text: '▶',
					click: (e) => {
						loadBackground(++backgroundIndex);
						e.stopPropagation();
					}
				})
			], document.body);

			// Create a controller to listen to toggling between states
			window.addEventListener('hashchange', hashchange);
		}
		

		// Passing in null for target inserts it into the body background
		bg = BG.init(null);

		// Set default state
		bg.setup?.({
			controls: false,
		});

		hashchange();

	});
});



// Listen to the background trigger to show/hide the background
function hashchange() {
	// Has the backdrop come into the focus?
	const controls = window.location.hash === '#background';

	// Add/Remove class from window
	window.document.documentElement.classList[controls ? 'add' : 'remove'](
		'background'
	);

	bg.config?.({controls});
}

// Fix ios scrolling issue
document.addEventListener(
	'touchmove',
	event => {
		event.preventDefault();
	},
	false
);
