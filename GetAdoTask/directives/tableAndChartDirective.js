"use strict";

define(["app"], function (app) {
	// A bootstrap style table & chart for the data statistics
	var html = '<div class="row">\
					<div class="col-md-4" >\
						<button class="btn btn-block" ng-click="action()" data-toggle="tooltip" title="{{title}}">{{ label }}</button>\
					</div>\
					<div class="col-md-4"></div>\
					<div class="col-md-4">\
						<button class="btn btn-primary pull-right" type="button" data-toggle="collapse" data-target="#{{uid}}" aria-expanded="false" aria-controls="{{uid}}">\
								Show/Hide\
						</button>\
					</div>\
				</div >\
				<div class="row collapse" id="{{uid}}">\
					<div class="col-md-4">\
						<table class="table table-hover table-bordered table-responsive" border="1">\
							<thead>\
								<tr>\
									<th>#</th>\
									<th ng-repeat="header in headers">{{ header }}</th>\
								</tr>\
							</thead>\
							<tbody>\
								<tr ng-repeat="data in sourceData">\
									<td align="center">{{ $index + 1}}</td>\
									<td ng-repeat="column in columns">{{data[column]}}</td>\
								</tr>\
							</tbody>\
						</table>\
					</div>\
					<div class="col-md-8">\
						<canvas class="chart chart-bar"\
							height="{chartData.ChartHeight}"\
							chart-data="chartData.ChartData"\
							chart-labels="chartData.ChartLabels"\
							chart-series="chartData.ChartSeries"\
							chart-options="chartData.ChartOptions"></canvas>\
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
				class: "@",		// Should be btn-info, btn-success etc.
				title: "@"		// Title for tooltip
			},
			template: html
		};
	});
});