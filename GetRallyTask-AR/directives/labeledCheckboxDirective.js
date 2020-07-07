'use strict';

define(['app'], function (app) {
	// A bootstrap style labeled checkbox which supports the html tooltip
	app.directive('labeledCheckbox', function() {
		return {
			restrict: 'EA',
			scope: {
				uid: '@',		// The unique id of the labeled checkbox
				label: '@',		// The label of checkbox
				ngModel: '=',	// AngularJs ng-model
				ngHide: '=',
				action: '&',	// The call to a controller's method when check/uncheck
				class: '@',		// Should be btn-info, btn-success etc.
				title: '@'		// Title for tooltip
			},
			template: '<label ng-hide="ngHide" for="{{uid}}" class="btn {{class}}" data-toggle="tooltip" title="{{title}}">\
							{{label}}\
							<input type="checkbox" ng-model="ngModel" ng-click="action()" id="{{uid}}" class="badgebox">\
							<span class="badge">&check;</span>\
						</label>'
		};
	});
});
