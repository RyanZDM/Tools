'use strict';

/**
 * Utility tool
 * @description All common methods here
 */
define(['app', 'underscore'], function (app, _) {
	app.service('utility', function () {
		return {
			copyToClipboard: copyToClipboard,
			groupByMultiple: groupByMultiple,
			saveToHtml: saveToHtml
		}

		/**
		 * @name	copyToClipboard
		 * @description	Copies text to clipboard
		 * @param	text	The text.
		 */
		function copyToClipboard(text) {
			var flag = false;
			if (window.clipboardData) {	// IE
				window.clipboardData.clearData();
				window.clipboardData.setData("Text", text);
			}

			var textarea = document.createElement("textarea");
			var currentFocus = document.activeElement;
			document.body.appendChild(textarea);
			textarea.value = text;
			textarea.focus();
			if (textarea.setSelectionRange)
				textarea.setSelectionRange(0, textarea.value.length);
			else
				textarea.select();
			try {
				flag = document.execCommand("copy");
			} catch (eo) {
				flag = false;
			}
			document.body.removeChild(textarea);
			currentFocus.focus();
			return flag;
		};

		/**
		 * @name	groupByMultiple
		 * @description	Group by multiple
		 * @param	array								data array to be group by.
		 * @param	{(string|function)[]}	iteratee	The iteratees to transform keys.
		 * @param	cumulativeItems						items will be cumulated.
		 * @returns	The cumulated items specified by 'cumulativeItems' group by 'iteratee'.
		 */
		function groupByMultiple(array, iteratee, cumulativeItems) {
			if (!array || array.length < 1) return [];
			if (!iteratee || iteratee.length < 1) return array;
			//if (!cumulativeItems || cumulativeItems.length < 1) return array;

			var firstBy = _.groupBy(array, iteratee[0]);
			var next = iteratee.slice(1);
			if (next.length > 0) {
				for (var prop in firstBy) {
					firstBy[prop] = groupByMultiple(firstBy[prop], next, cumulativeItems);
				}
			} else {
				// The dat got grouped by all iteratees, accumulate the item values
				if (cumulativeItems && cumulativeItems.length > 0) {
					var cumulatedRecords = {};
					for (var lastGroupItem in firstBy) {
						var count = 0;
						var cumulatedRecord = { };
						_.each(cumulativeItems,
							function(item) {
								cumulatedRecord[item] = 0;
							});

						_.each(firstBy[lastGroupItem], function (record) {
							_.each(cumulativeItems, function (item) {
								if (record[item]) {
									cumulatedRecord[item] = cumulatedRecord[item] + record[item];
								}
							});

							count++;
						});

						cumulatedRecord._Count = count;
						cumulatedRecords[lastGroupItem] = cumulatedRecord;
					}

					return cumulatedRecords;
				}
			}

			return firstBy;
		};

		/**
		 * @name saveToHtml
		 * @param {string} filename	The filename to be saved
		 * @param {string} contentHtml		The content of HTML. Note: Should not inlcude the <html></html> marker
		 */
		function saveToHtml(filename, contentHtml) {
			var bodyHtml = document.getElementById('warningReportDetail').innerHTML;
			var html = '<!DOCTYPE html><html lang="en" xmlns="http://www.w3.org/1999/xhtml">' + contentHtml + '</html>';

			var file = new Blob([html], { type: "text/html" });
			var link = document.createElement("a");
			link.download = filename;
			link.href = URL.createObjectURL(file);
			link.click();
		};

		/**
		 * @name sendEmail
		 * @param {string} to	The list of email address separated with the symbol ';'
		 * @param {string} cc	The list of email address separated with the symbol ';'
		 * @param {string} subject	The subject of email
		 * @param {string} body	The email body
		 * @param {string} attachment	The path to email attachment
		 */
		function sendEmail(to, cc, subject, body, attachment) {
			if ( (!to || to.trim() === '') && (!cc || cc.trim() === '') ) return;

			if (!to) { to = ''; }

			ccString = (cc && cc.trim() !== '') ? ('cc=' + cc + '&') : '';
			var attach = (attachment && attachment.trim() !== '') ? '&attach="' + attachment + '"' : '';
			window.open('mailto:' + to + '?' + ccString + 'subject=' + subject + '&body=' + body + attach);
		}
	});
});
