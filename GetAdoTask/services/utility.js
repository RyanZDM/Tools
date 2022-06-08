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
			sendEmail: sendEmail,
			getRowData: getRowData,
			setRowData: setRowData,
			monitorOnArrayChange: monitorOnArrayChange,
			getPureNameString: getPureNameString
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
		}

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

			if (caseSensitive && !ignoreNonAlphanumericChar) {
				// Directly group by
				return internalGroupByMultiple(array, iteratee, cumulativeItems, caseSensitive, ignoreNonAlphanumericChar);
			}

			var groupByColPrefix = "_groupby_col_";
			var uniqueKeyMappings = [];
			var newIteratee = [];
			for (let index in iteratee) {
				newIteratee.push(groupByColPrefix + index);
				uniqueKeyMappings.push({});
			}

			var newData = [];
			for (let index in array) {
				var row = array[index];

				var newRow = {};

				// re-calculate the value of group by columns
				for (let iterIndex in iteratee) {
					var ite = iteratee[iterIndex];

					var value = (typeof ite === "string") ? getRowData(row, ite) : ite(row);
					if (!value) {
						value = "<unspecified>";
					} else {
						if ( value.match(/^(unspec|unknow)/i)) {
							value = "<unspecified>";
						}
					}

					var pureName = (value !== "<unspecified>") ? getPureNameString(value, caseSensitive, ignoreNonAlphanumericChar) : value;

					// Use the first value represent all duplicated values
					var iterateeCol = newIteratee[iterIndex];
					if (!uniqueKeyMappings[iterIndex][pureName]) {
						uniqueKeyMappings[iterIndex][pureName] = value;
						newRow[iterateeCol] = value;
					} else {
						newRow[iterateeCol] = uniqueKeyMappings[iterIndex][pureName];
					}
				}

				// get the columns to be cumulated
				cumulativeItems.forEach(item => {
					newRow[item] = getRowData(row, item);
				});

				newData.push(newRow);
			}

			return internalGroupByMultiple(newData, newIteratee, cumulativeItems, caseSensitive, ignoreNonAlphanumericChar);
		}

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
		}

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
				, ['<br>', '\r\n']
				, ['&nbsp;', ' ']
				, ['&lt;', '<']
				, ['&gt;', '>']
			];

			for (let index in keywords) {
				html = html.replaceAll(keywords[index][0], keywords[index][1]);
			}

			html = html.replace(/<[^>]*>/g, "");

			while (html.indexOf("  ") !== -1) {
				html = html.replaceAll("  ", " ");
			}

			return html;
		}

		/**
		 * @name sendEmail
		 * @param {string} to	The list of email address separated with the symbol ';'
		 * @param {string} cc	The list of email address separated with the symbol ';'
		 * @param {string} subject	The subject of email
		 * @param {string} body	The email body
		 * @param {string} attachment	The path to email attachment
		 */
		function sendEmail(to, cc, subject, body, attachment) {
			if ((!to || to.trim() === "") && (!cc || cc.trim() === "")) return;

			if (!to) { to = ""; }

			var ccString = (cc && cc.trim() !== "") ? ("cc=" + cc + "&") : "";
			var attach = (attachment && attachment.trim() !== "") ? '&attach="' + attachment + '"' : "";
			window.open("mailto:" + to + "?" + ccString + "subject=" + subject + "&body=" + body + attach);
		}

		/**
		 * @name	getPureNameString
		 * @description	Gets the string contains the alphabet only
		 * @param {any} name
		 * @param {any} caseSensitive
		 * @param {any} ignoreNonAlphanumericChar
		 */
		function getPureNameString(name, caseSensitive, ignoreNonAlphanumericChar) {
			var newCol = caseSensitive ? name : name.toLowerCase();
			if (ignoreNonAlphanumericChar) {
				newCol = newCol.replace(/[^a-zA-Z0-9]/g, "").replace(/\s+/g, "");
			}

			return newCol;
		}

		/**
		 * @name getRowData 
		 * @param {any} row	The data row
		 * @param {any} colName	The column name in which may contains the "."
		 *				e.g. "CPE.Property1.Property11
		 */
		function getRowData(row, colName) {
			if (!row || !colName) return "";

			var val = row[colName];
			if (!val) {
				if (colName.indexOf(".") === -1) return "";

				val = row;
				colName.split(".").forEach(function (col) {
					val = val[col];
				});
			}

			return val;
		}

		/**
		 * @name setRowData
		 * @description	Sets the row value
		 * @param {any} row	The data row
		 * @param {any} colName	The column name in which may contains the "."
		 *				e.g. "CPE.Property1.Property11"
		 * @param {any} val	The value
		 */
		function setRowData(row, colName, val) {
			if (!row || !colName) return false;

			if (row[colName]) {
				// Found the column, directly set value
				row[colName] = val;
				return true;
			} else if (colName.indexOf(".") === -1) {
				row[colName] = val;
			} else {
				var colList = colName.split(".");
				var realCol = colList.pop();
				var tempProperty = row;
				colList.forEach(col => {
					if (!tempProperty[col]) {
						// Init it since no this property yet
						tempProperty[col] = {};
					};

					tempProperty = tempProperty[col];
				});

				tempProperty[realCol] = val;
			}

			return true;
		}

		/**
		 * @name monitorOnArrayChange
		 * @param {any} arr
		 * @param {any} callback
		 */
		function monitorOnArrayChange(arr, callback) {
			["pop", "push", "shift", "unshift", "splice"].forEach(method => {
				arr[method] = function() {
					var ret = Array.prototype[method].apply(arr, arguments);
					callback.apply(arr, arguments);
					return ret;
				}
			});
		}

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
		function internalGroupByMultiple(array, iteratee, cumulativeItems, caseSensitive, ignoreNonAlphanumericChar) {
			var firstBy = _.groupBy(array, iteratee[0]);
			var next = iteratee.slice(1);
			if (next.length > 0) {
				for (let prop in firstBy) {
					var cnt = firstBy[prop].length;
					firstBy[prop] = internalGroupByMultiple(firstBy[prop], next, cumulativeItems, caseSensitive, ignoreNonAlphanumericChar);
					firstBy[prop].__Count = cnt;
				}
			} else {
				// The dat got grouped by all iteratees, accumulate the item values
				if (!cumulativeItems) {
					cumulativeItems = [];	// Means calculate the count only
				} else {
					cumulativeItems = [].concat(cumulativeItems);
				}

				var cumulatedRecords = {};
				for (let lastGroupItem in firstBy) {
					var cumulatedRecord = {};
					if (cumulatedRecords[lastGroupItem]) {
						cumulatedRecord = cumulatedRecords[lastGroupItem];
					} else {
						_.each(cumulativeItems,
							function (item) {
								cumulatedRecord[item] = 0;
							});

						cumulatedRecord.__Count = 0;
					}

					_.each(firstBy[lastGroupItem], function (record) {
						_.each(cumulativeItems, function (item) {
							if (record[item]) {
								cumulatedRecord[item] = cumulatedRecord[item] + record[item]
							}
						});

						cumulatedRecord.__Count++;
					});

					cumulatedRecords[lastGroupItem] = cumulatedRecord;
				}

				return cumulatedRecords;
			}

			return firstBy;
		}
	});
});
