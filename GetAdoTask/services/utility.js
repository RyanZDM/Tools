"use strict";

/**
 * Utility tool
 * @description All common methods here
 */
define(["app", "underscore"], function (app, _) {
	app.service("utility", function () {
		return {
			copyToClipboard: copyToClipboard,
			groupByMultiple: groupByMultiple,
			saveToHtml: saveToHtml,
			html2PlainText: html2PlainText,
			sendEmail: sendEmail
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
		 * @param	cumulativeItems						items will be accumulated.
		 * @param	caseSensitive						if case sensitive
		 * @param	ignoreNonAlphanumericChar			if ignore non Alphanumeric char
		 * @returns	The cumulated items specified by 'cumulativeItems' group by 'iteratee'.
		 */
		function groupByMultiple(array, iteratee, cumulativeItems, caseSensitive, ignoreNonAlphanumericChar) {
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
				if (!cumulativeItems) {
					cumulativeItems = [];	// Means calculate the count only
				} else {
					cumulativeItems = [].concat(cumulativeItems);
				}

				// Find out all duplicated columns (case insensitive, remove -, _ and white space)
				// and return the first matched column 
				var uniqueKeyDict = {};
				var uniqueList = [];
				Object.keys(firstBy).forEach(function (col) {
					var pureName = getPureNameString(col, caseSensitive, ignoreNonAlphanumericChar);
					//uniqueKeyDict[col] = pureName;

					var found = false;
					for (const [key, value] of Object.entries(uniqueKeyDict)) {
						// Find a duplicated item, use that one as pure name
						if (value === pureName) {
							uniqueKeyDict[col] = key;
							found = true;
							break;
						}
					}

					if (!found) {
						// This is first one, record the pure name
						uniqueKeyDict[col] = pureName;
						uniqueList.push(col);
					}
				});

				// Change the column name back
				uniqueList.forEach(function (col) {
					uniqueKeyDict[col] = col;
				})

				var cumulatedRecords = {};
				for (var lastGroupItem in firstBy) {
					var correctColName = uniqueKeyDict[lastGroupItem];
					var cumulatedRecord = {};
					if (cumulatedRecords[correctColName]) {
						cumulatedRecord = cumulatedRecords[correctColName];
					} else {
						_.each(cumulativeItems,
							function (item) {
								cumulatedRecord[item] = 0;
							});

						cumulatedRecord._Count = 0;
					}

					_.each(firstBy[lastGroupItem], function (record) {
						_.each(cumulativeItems, function (item) {
							cumulatedRecord[item].MatchedColumns.forEach(function (matched) {
								if (record[col]) {
									cumulatedRecord[item] = cumulatedRecord[item] + record[item]
								}
							});
						});

						cumulatedRecord._Count++;
					});

					cumulatedRecords[correctColName] = cumulatedRecord;
				}
				
				return cumulatedRecords;
			}

			return firstBy;
		};

		/**
		 * @name saveToHtml
		 * @param {string} filename	The filename to be saved
		 * @param {string} contentHtml		The content of HTML. Note: Should not inlcude the <html></html> marker
		 */
		function saveToHtml(filename, contentHtml) {
			//var bodyHtml = document.getElementById('warningReportDetail').innerHTML;
			var html = '<!DOCTYPE html><html lang="en" xmlns="http://www.w3.org/1999/xhtml">' + contentHtml + "</html>";

			var file = new Blob([html], { type: "text/html" });
			var link = document.createElement("a");
			link.download = filename;
			link.href = URL.createObjectURL(file);
			link.click();
		};

		/**
		 * @name html2PlainText
		 * @param {string} html format string
		 * @return {string} the plain text
		 */
		function html2PlainText(html) {
			if (!html) return "";

			var keywords = [['&quot;', '"']
				//,['\t', ' ']
				//,['\r\n', ' ']
				,['<br>', '\r\n']
				,['&nbsp;', ' ']
				,['&lt;', '<']
				,['&gt;', '>']
			];

			for (var index in keywords)
			{
				html = html.replaceAll(keywords[index][0], keywords[index][1]);
			}

			html = html.replace(/<[^>]*>/g, "");

			while (html.indexOf("  ") !== -1) {
				html = html.replaceAll("  ", " ");
			}

			return html;	
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
			if ( (!to || to.trim() === "") && (!cc || cc.trim() === "") ) return;

			if (!to) { to = ""; }

			var ccString = (cc && cc.trim() !== "") ? ("cc=" + cc + "&") : "";
			var attach = (attachment && attachment.trim() !== "") ? '&attach="' + attachment + '"' : "";
			window.open("mailto:" + to + "?" + ccString + "subject=" + subject + "&body=" + body + attach);
		};

		function getPureNameString(name, caseSensitive, ignoreNonAlphanumericChar) {
			var newCol = caseSensitive ? name : name.toLowerCase();
			if (ignoreNonAlphanumericChar) {
				newCol = newCol.replace(/[^a-zA-Z0-9]/g, "").replace(/\s+/g, "");
			}

			return newCol;
		};
	});
});
