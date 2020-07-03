'use strict';

define(['app'], function (app) {
	app.directive('labeledCheckbox', function() {
		return {
			restrict: 'EA',
			scope: {
				uid: '@',
				label: '@',
				ngModel: '=',
				action: '&',
				class: '@',		// Should be btn-info, btn-success etc.
				title: '@'		// Title for tooltip
			},
			template: '<label for="{{uid}}" class="btn {{class}}" data-toggle="tooltip" title="{{title}}">\
							{{label}}\
							<input type="checkbox" ng-model="ngModel" ng-click="action()" id="{{uid}}" class="badgebox">\
							<span class="badge">&check;</span>\
						</label>'
		};
	});
});
