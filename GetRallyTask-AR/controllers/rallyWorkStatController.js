'use strict';

define(['app', 'underscore'],
	function (app, _) {
		app.controller('rallyWorkStatController', [
			'$scope',
			'$rootScope',
			'$http',
			'$q',
			'rallyRestApi',
			'rallyAuthService',
			'rallyQueryService',

			function ($scope, $rootScope, $http, $q, rallyRestApi, rallyAuthService, rallyQueryService) {
				$scope.RALLY_INTERNAL_ERROR = 'RallyInternalError';
				$scope.ReleaseList = ['RPS1 1.4 Release', 'Common 1.4A Release', 'Transportable 1.4 Release'];
				$scope.FeatureList = [];
				$scope.Release = '';
				$scope.UserId = '';
				$scope.UserPwd = '';
				$scope.inQuerying = false;
				$scope.ErrorMsg = '';

				$scope.CanUseLocalStorage = rallyAuthService.CanUseLocalStorage;

				$scope.clearError = function () {
					$scope.ErrorMsg = '';
				}

				$scope.refreshFeatureList = function () {
					$scope.clearError();
					return $scope.refreshFeature($scope.Release, true, $q);
				};

				$scope.refreshAll = function () {
					$scope.clearError();
					$scope.FeatureList = [];

					$scope.refreshFeature('', false, $q);
				};

				$scope.refreshFeature = function (release, clearDataFirst, q) {
					if (clearDataFirst) { $scope.FeatureList = []; }

					$scope.inQuerying = true;
					var token = rallyAuthService.getAuthenticationToken();
					q.all(rallyQueryService.getFeatureFromRally(release, token))
						.then(function (list) {
							$scope.FeatureList = list;
						})
						.catch(function (error) { reportError(error); })
						.finally(function () { $scope.inQuerying = false; });
				};

				function reportError(error) {
					console.error(error.statusText);
					if (error.statusText === $scope.RALLY_INTERNAL_ERROR) {
						$scope.ErrorMsg = error.QueryResult.Errors.join(' || ');
					} else {
						$scope.ErrorMsg = error.statusText;
					}
				};
				
				$scope.getWarningReport = function () {
					$scope.inQuerying = true;
					var token = rallyAuthService.getAuthenticationToken();
					rallyQueryService.getWarningReport(token)
										.then(function (data) {
											//
										})
										.catch(function (error) { reportError(error); })
										.finally(function () { $sceope.inQuerying = false; });
				}
			}]);
	});
