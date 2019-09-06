'use strict';

/**
 * Utility tool
 *
 * @description All common methods here
 */
define(['app', 'underscore'], function (app, _) {
	app.service('utility', function () {
		return {
			copyToClipboard: copyToClipboard,
			groupByMultiple: groupByMultiple
		}
		
		function copyToClipboard(text) {
			if (window.clipboardData) {	// IE
				window.clipboardData.clearData();
				window.clipboardData.setData("Text", text);
				return;
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
				var flag = document.execCommand("copy");
			} catch (eo) {
				var flag = false;
			}
			document.body.removeChild(textarea);
			currentFocus.focus();
			return flag;
		}

		/**
		 *
		 * @param array	data array to be group by
		 * @param {(string|function)[]} iteratee - The iteratees to transform keys.
		 * @param cumulativeItems	items will be cumulated
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
						_.each(cumulativeItems, function (item) {
							cumulatedRecord[item] = 0;
						})

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
		}
	});
});
