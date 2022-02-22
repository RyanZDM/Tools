"use strict";

require.config({
	paths: {
		"jquery": "libs/jquery/3.5.1/jquery",
		"angular": "libs/angularjs/1.8.0/angular",
		"domReady": "libs/require-domready/2.0.1/domReady",
		"bootstrap": "libs/bootstrap/current/bootstrap",
		"underscore": "libs/underscore/1.8.3/underscore",
		"moment": "libs/momentjs/2.23.0/moment.min",
		"chart": "libs/chartjs/2.8.0/Chart.min",
		"angular-chart": "libs/angular-chart.js/1.1.1/angular-chart.min",
		"app": "app"
	},
	shim: {
		"bootstrap": ["jquery"],
		"angular": { exports: "angular" },
		"underscore": { exports: "_" },
		"chart.js": {
			deps: ["angular", "chart"]
		}
	}
});

require(["jquery"]);
require(["bootstrap"]);
require(["angular-chart"]);
require(["app"]);
require(["currentSettings"]);
require(["services/adoRestApi"]);
require(["services/adoWorkItem"]);
require(["services/adoFeature"]);
require(["services/utility"]);
require(["services/adoAuthService"]);
require(["services/adoQueryService"]);
require(["directives/adoLoginDirective"]);
require(["directives/labeledCheckboxDirective"]);
require(["directives/tableAndChartDirective"]);
require(["controllers/adoTaskController"]);

/* If need to do some extra initialization when loaded the lib
require(['jquery'], function ($) {
	//require(['bootstrap'], function () { });
});

require(['app'], function(app) {});
require(['services/adoAuthService'], function (adoAuthService) { });
require(['services/adoTaskQueryService'], function (adoTaskQueryService) { });
require(['directives/adoLoginDirective'], function (adoLoginDirective) { });
require(['controllers/adoTaskController'], function (adoTaskController) { });
*/

/* Uses domReady is better than document.ready()
require(['angular', 'app'], function(angular) {
	angular.element(document).ready(function() {  
				angular.bootstrap(document, ['getRallyWorksApp']); 
			});
});
*/

require(["domReady!"], function (document) {
	require(["jquery", "angular"], function ($, angular) {
		angular.bootstrap(document, ["getRallyWorksApp"]);
		//$('[data-toggle="tooltip"]').tooltip()
	});
});