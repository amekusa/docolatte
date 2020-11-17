/**
 * Automatically takes screenshots using a headless browser
 * @author Satoshi Soma (amekusa.com)
 */

const puppeteer = require('puppeteer-core');

(async () => {
	let browser = await puppeteer.launch({
		headless: true,
		executablePath: '/Applications/Chromium.app/Contents/MacOS/Chromium',
		args: ['--start-maximized']
	});
	let ua = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36';
	console.log(`Taking screenshots using`, await browser.version(), '...');

	// pages to go
	let base = 'file://' + __dirname + '/fixtures-doc/';
	let pages = [
		{
			url: base + 'module-mixins_signalable-Signal.html',
			viewport: [1024, 640],
			scroll: [0, 0],
			saveAs: 'class.png'
		}, {
			url: base + 'module-ink_collector.html',
			viewport: [1024, 640],
			scroll: [0, 300],
			saveAs: 'methods.png'
		}, {
			url: base + 'module-base.html',
			viewport: [1024, 640],
			saveAs: 'footer.png'
		}, {
			url: base + 'documents_collector.js.html#line7',
			viewport: [1024, 640],
			saveAs: 'source.png'
		}, {
			url: base + 'base_chains.html',
			viewport: [375, 667],
			saveAs: 'mobile.png'
		}, {
			url: base + 'base_chains.html',
			viewport: [375, 667],
			click: '.menu-button',
			saveAs: 'mobile-menu.png'
		}
	];

	// process each page
	for (let i of pages) {
		if (!i.scroll) i.scroll = [0, 0];

		let page = await browser.newPage();
		await page.setUserAgent(ua);
		await page.setViewport({
			width:  i.viewport[0] + i.scroll[0],
			height: i.viewport[1] + i.scroll[1]
		});

		// start browsing
		await page.goto(i.url, {
			waitUntil: 'networkidle0',
			timeout: 60000
		});

		// scroll
		if (i.scroll) {
			await page.evaluate(i => {
				window.scrollTo({
					left: i.scroll[0],
					top:  i.scroll[1],
					behavior: 'auto'
				});
				Promise.resolve();
			}, i);
			// wait for scroll
			await page.waitForTimeout(1000);
		}

		// click
		if (i.click) {
			await page.click(i.click);
			await page.waitForTimeout(1000);
		}

		// compute clipping area
		if (!i.clip) i.clip = { x: 0, y: 0 };
		if (!('width'  in i.clip)) i.clip.width  = i.viewport[0];
		if (!('height' in i.clip)) i.clip.height = i.viewport[1];
		i.clip.x += i.scroll[0];
		i.clip.y += i.scroll[1];

		// take screenshot
		let saveTo = __dirname + '/gallery/' + i.saveAs;
		await page.screenshot({
			path: saveTo,
			fullPage: false,
			clip: i.clip
		});
		console.log(saveTo);
	}

	// close the browser
	await browser.close();
	console.log('Done.');
})();
