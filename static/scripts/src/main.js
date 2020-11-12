/**
 * @param {string} query
 * @param {int} index
 * @return {NodeList|Element|null}
 */
function q(query, index = null) {
	let items = document.querySelectorAll(query);
	if (index == null) return items;
	if ((index+1) > items.length) return null;
	return items[index];
}

document.addEventListener('DOMContentLoaded', () => {
	// close the sidebar menu
	// when user clicked one of the menu items
	q('.sidebar a').forEach(a => {
		a.addEventListener('click', ev => {
			let checkbox = q('input#docolatte-shows-sidebar', 0);
			if (!checkbox) return;
			if (checkbox.checked) checkbox.click();
		});
	});
});
