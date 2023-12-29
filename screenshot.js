/**
 * Automatically takes screenshots using a headless browser
 * @author Satoshi Soma (amekusa.com)
 */

const puppeteer = require('puppeteer-core');

const conf = {
	browser: {
		headless: true,
		executablePath: '/Applications/Chromium.app/Contents/MacOS/Chromium',
		args: ['--start-maximized']
	},
	ua:  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36',
	url: 'file://' + __dirname + '/docs/',
	dst: __dirname + '/gallery/',
	close: true,
};


// ---- Utils -------- *

function delay(s) {
	return new Promise(done => {
		setTimeout(done, s * 1000);
	});
}


// ---- Main -------- *

(async () => {
	let browser = await puppeteer.launch(conf.browser);
	console.log(`Taking screenshots using`, await browser.version(), '...');

	// pages to go
	let pages = [
		{
			url: 'Docolatte.html',
			viewport: [800, 480],
			theme: 'light',
			saveAs: 'light.png',
		},
		{
			url: 'Docolatte.html',
			viewport: [800, 480],
			theme: 'dark',
			saveAs: 'dark.png',
		},
		{
			url: 'lib_Docolatte.js.html#line15',
			viewport: [800, 480],
			scroll: [0, 170],
			saveAs: 'source.png'
		},
		{
			url: 'Docolatte.html',
			viewport: [375, 667],
			saveAs: 'mobile.png'
		},
		{
			url: 'Docolatte.html',
			viewport: [375, 667],
			click: '.menu-button',
			saveAs: 'mobile-menu.png'
		},
	];

	// process each page
	for (let p of pages) {
		if (!p.scroll) p.scroll = [0, 0];

		// setup page
		let page = await browser.newPage();
		await page.exposeFunction('delay', delay);
		await page.setUserAgent(conf.ua);
		await page.setViewport({
			width:  p.viewport[0] + p.scroll[0],
			height: p.viewport[1] + p.scroll[1]
		});

		// start browsing
		await page.goto(conf.url + p.url, {
			waitUntil: 'networkidle0',
			timeout: 60000
		});

		// scripting
		await page.evaluate(async p => {
			// reset sidebar scroll position
			document.querySelector('.sidebar .wrap').scrollTo({
				left: 0, top: 0,
				behavior: 'auto'
			});
			// change theme
			if (p.theme) {
				let ls = window.$docolatte.lightSwitch;
				ls.setState(p.theme);
				await delay(1);
			}
			// scroll window
			window.scrollTo({
				left: p.scroll[0],
				top:  p.scroll[1],
				behavior: 'auto'
			});
			await delay(1);
		}, p);

		// click
		if (p.click) {
			await page.click(p.click);
			await delay(1);
		}

		// compute clipping area
		if (!p.clip) p.clip = { x: 0, y: 0 };
		if (!('width'  in p.clip)) p.clip.width  = p.viewport[0];
		if (!('height' in p.clip)) p.clip.height = p.viewport[1];
		p.clip.x += p.scroll[0];
		p.clip.y += p.scroll[1];

		// take screenshot
		let saveTo = conf.dst + p.saveAs;
		await page.screenshot({
			path: saveTo,
			fullPage: false,
			clip: p.clip
		});
		console.log(saveTo);
	}

	// close the browser
	if (conf.close) await browser.close();
	console.log('Done.');
})();
