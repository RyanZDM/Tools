"use strict";

define(["app"], function (app) {
	// A bootstrap style table & chart for the data statistics
	var html = '<div class="row" style="margin-top: 2px;">\
					<div class="col-md-4" >\
						<button ng-disabled="disableButton.toLowerCase() === \'true\'" class="btn btn-block" ng-click="action()" data-toggle="tooltip" title="{{tip}}"><span class="pull-left">{{label}}</span></button>\
					</div>\
					<div class="col-md-4"></div>\
					<div class="col-md-4" >\
						<div class="input-group pull-right" style="margin-right: 5px;">\
							<button class="btn btn-primary" ng-click="exportData(sourceData, columns)">Copy</button>\
							<button class="btn btn-primary" type="button" data-toggle="collapse" data-target="#{{uid}}" aria-expanded="false" aria-controls="{{uid}}">\
									Show/Hide\
							</button>\
						</div>\
					</div>\
				</div >\
				<div class="row {{state}}" id="{{uid}}">\
					<div class="col-md-4">\
						<table class="table table-hover table-bordered table-responsive" border="1">\
							<thead>\
								<tr>\
									<th style="vertical-align: middle; text-align: center">#</th>\
									<th ng-repeat="header in headers" style="vertical-align: middle; text-align: center">{{ header }}</th>\
								</tr>\
							</thead>\
							<tbody>\
								<tr ng-repeat="data in sourceData">\
									<td style="vertical-align: middle; text-align: center">{{ $index + 1}}</td>\
									<td ng-repeat="column in columns" style="vertical-align: middle; text-align: center">{{data[column]}}</td>\
								</tr>\
							</tbody>\
						</table>\
					</div>\
					<div class="col-md-8">\
						<canvas id="{{uid}}_Chart" style="width:100%;max-width:700px"></canvas>\
					</div>\
				</div>';
	app.directive("tableAndChart", function() {
		return {
			restrict: "EA",
			priority1: 1001,
			scope: {
				uid: "@",		// The unique id
				label: "@",		// The label
				headers: "=",	// table headers
				columns: "=",	// table column name
				sourceData: "=",// The name of array containing the data records
				chartData: "=",	// The name of object containing the chart data
				ngModel: "=",	// AngularJs ng-model				
				action: "&",	// The call to a controller's method after click
				exportData: "&",
				disableButton: "@",// Show a label instead of button
				class: "@",		// Should be btn-info, btn-success etc.
				state: "@",	// if collapse the div
				tip: "@"		// Tooltip title
			},
			template: html
		};
	});
});