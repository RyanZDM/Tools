"use strict";

define(["app"], function (app) {
	// A bootstrap style labeled checkbox which supports the html tooltip
	app.directive("labeledCheckbox", function() {
		return {
			restrict: "EA",
			scope: {
				uid: "@",		// The unique id of the labeled checkbox
				label: "@",		// The label of checkbox
				shortlabel: "@",	// The short version label when the browser size shrink
				ngModel: "=",	// AngularJs ng-model
				ngHide: "=",
				action: "&",	// The call to a controller's method when check/uncheck
				class: "@",		// Should be btn-info, btn-success etc.
				title: "@"		// Title for tooltip
			},
			template: '<label ng-hide="ngHide" for="{{uid}}" class="btn {{class}}" data-toggle="tooltip" title="{{title}}">\
							<span class="label-normal">{{label}}</span>\
							<span class="label-short">{{shortlabel}}</span>\
							<input type="checkbox" ng-model="ngModel" ng-click="action()" id="{{uid}}" class="badgebox">\
							<span class="badge badge-pill badge-light">&check;</span>\
						</label>',
			link: function(scope, element, attrs) {
				if (!scope.shortlabel) {
					scope.shortlabel = scope.label;
				}
			}
		};
	});
});
