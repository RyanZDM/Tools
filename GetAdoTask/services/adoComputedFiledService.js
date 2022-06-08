"use strict";

define(["app"], function (app) {

	app.service("adoComputedFiledService", ["utility", function (utility) {
		function updateCustomizedFields(wit, computedFields) {
			computedFields.forEach(function (fieldSetting) {
				try {
					var value = eval(fieldSetting.Script);
					utility.setRowData(wit, fieldSetting.Field, value);
				} catch (e) {
					utility.setRowData(wit, fieldSetting.Field, "<syntax error>");
				}
			});
		};

		/**
		 * name	getCompuedFields
		 * @param {string} computedFieldList	The string contains all computed fields separated by ^. 
		 */
		function getComputedFields(computedFieldList) {
			if (!computedFieldList || computedFieldList.trim() === "") {
				return [];
			}

			var computedFields = [];
			var defineList = computedFieldList.trim().split("^");
			defineList.forEach(function (define) {
				var field = getComputedField(define);
				if (field) {
					computedFields.push(field);
				}
			});

			return computedFields;
		};

		/**
		 * name	getComputedField
		 * @param {string} script	The string contains the definition of a computed filed. Note: Must use wit as the name of data set;
		 *		e.g.
		 *			RealAssign=(wit['System.AssignedTo'].displayName === 'Ryan ZHANG') ? 'Me' : 'Others'
		 */
		function getComputedField(script) {
			if (!script) return null;

			var pos = script.indexOf("=");
			if (pos === -1) return null;

			var field = script.substr(0, pos).trimStart().trimEnd();
			script = script.substr(pos + 1).trimStart().trimEnd();
			if (script === "") return null;

			return { Field: field, Script: script };
		}

		var computedFiledService = {
			updateCustomizedFields: updateCustomizedFields,
			getComputedFields: getComputedFields,
			getComputedField: getComputedField
		};

		return computedFiledService;
	}]);
});