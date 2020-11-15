const puppeteer = require('puppeteer-core');

(async () => {
	let browser = await puppeteer.launch({
		headless: true,
		executablePath: '/Applications/Chromium.app/Contents/MacOS/Chromium',
		args: ['--start-maximized']
	});
	let ua = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36';

	// pages to go
	let base = 'file://' + __dirname + '/fixtures-doc/';
	let pages = [
		{
			url: base + 'module-ink_collector.html',
			viewport: [1024, 640],
			scroll: [0, 300],
			saveAs: 'test-desktop.png'
		}, {
			url: base + 'module-ink_collector.html',
			viewport: [375, 667],
			scroll: [0, 200],
			saveAs: 'test-mobile.png'
		}
	];
	let saveTo = __dirname + '/gallery/';

	// process the pages
	for (let i of pages) {
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

		// compute clipping area
		if (!i.clip) i.clip = { x: 0, y: 0 };
		if (!('width'  in i.clip)) i.clip.width  = i.viewport[0];
		if (!('height' in i.clip)) i.clip.height = i.viewport[1];
		i.clip.x += i.scroll[0];
		i.clip.y += i.scroll[1];

		// take screenshot
		await page.screenshot({
			path: saveTo + i.saveAs,
			fullPage: false,
			clip: i.clip
		});
	}

	console.log(await browser.version());

	// close the browser
	await browser.close();
})();
