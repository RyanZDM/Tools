"use strict";

define(["app", "underscore"], function (app, _) {

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
		 * @param {string} comptedFieldList	The string contains all computed fields separated by ^. 
		 */
		function getComputedFields(comptedFieldList) {
			if (!comptedFieldList || comptedFieldList.trim() === "") {
				return [];
			}

			var computedFields = [];
			var defineList = comptedFieldList.trim().split("^");
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
			var script = script.substr(pos + 1).trimStart().trimEnd();
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