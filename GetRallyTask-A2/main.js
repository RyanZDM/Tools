'use strict';

require.config({
	paths: {
		'jquery': 'libs/jquery/3.2.1/jquery',
		'angular': 'libs/angularjs/1.4.6/angular',
		'domReady': 'libs/require-domready/2.0.1/domReady',
		'bootstrap': 'libs/bootstrap/3.3.7/bootstrap',
		'underscore': 'libs/underscore/1.8.3/underscore-min',
		'app': 'app'
	},
	shim: {
		'angular': { exports: 'angular' },
		'underscore': { exports: '_' }
	},
	//deps: ['bootstrap']
});

require(['jquery'], function ($) {
	require(['bootstrap'], function () { });
});

require(['app'], function(app) {});
require(['services/rallyAuthService'], function (rallyAuthService) { });
require(['services/rallyTaskQueryService'], function (rallyTaskQueryService) { });
require(['directives/rallyLoginDirective'], function (rallyLoginDirective) { });
require(['controllers/rallyTaskController'], function (rallyTaskController) { });

//require(['angular', 'app'], function(angular) {
//	angular.element(document).ready(function() {  
//				angular.bootstrap(document, ['getRallyWorksApp']); 
//			});
//});

require(['domReady!'], function (document) {
	require(['jquery', 'angular'], function ($, angular) {
		angular.bootstrap(document, ['getRallyWorksApp']);
	});
});