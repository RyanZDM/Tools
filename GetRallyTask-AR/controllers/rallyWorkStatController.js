'use strict';

define(['app', 'underscore', 'moment'],
	function (app, _, moment) {
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
				$scope.ReleaseList = ['Common 1.4A Release', 'Transportable 1.4 Release', 'Revo Plus 1.4 Release'];
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

				function getReportData(data) {
					var total = 0;
					var nameListByCategory = {};
					var fullNameList = {};
					var iv14Members = rallyRestApi.OwnerEmailMapping;
					_.each(data, function (category) {
						category.Data = _.reject(category.Data, function (item) {
							return !(iv14Members[item.Owner]);
						});

						total = total + category.Data.length;

						var names = _.chain(category.Data).map(function (item) { return item.Owner }).uniq().value();
						fullNameList = _.union(fullNameList, names);
						nameListByCategory[category.Category] = names.join(",");
					});

					var emailList = [];
					_.each(fullNameList, function (name) {
						if (iv14Members[name]) { emailList.push(iv14Members[name]) };
					});

					return { Total: total, NameListByCategory: nameListByCategory, EmailList: emailList.join(";"), Data: data };
				};

				function getReportFilename() {
					return ("RallyWarningReport-" + moment().format("YYYYMMDD") + ".html");
				};
				
				$scope.getWarningReport = function () {
					$scope.inQuerying = true;
					var token = rallyAuthService.getAuthenticationToken();
					rallyQueryService.getWarningReport(token)
										.then(function (data) {
											$scope.WarningReport = getReportData(data);
										})
										.catch(function (error) { reportError(error); })
										.finally(function () { $scope.inQuerying = false; });
				}

				/**
				 *name exportWarningReport 
				 *description Exports the generated warning report as a individual HTML file, would pop up a dialog for the downloading
				 */
				$scope.exportWarningReport = function() {
					var bodyHtml = document.getElementById('warningReportDetail').innerHTML
					var html = '<!DOCTYPE html><html lang="en" xmlns="http://www.w3.org/1999/xhtml">\
						<head><meta charset="utf-8"/>\
							<style>\
								table th {\
									text-align: center;\
								}\
								table, th, td {\
									border: 1px solid grey;\
									border-collapse: collapse;\
									padding: 5px;\
								}\
								table tr:nth-child(odd) {\
									background-color: #f1f1f1;\
								}\
								table tr:nth-child(even) {\
									background-color: #ffffff;\
								}\
								.bg-primary {\
									color: #fff;\
									background-color: #337ab7;\
								}\
								.text-success {\
										color: #3c763d;\
								}\
							</style>\
						</head>\
						<body>' +
									bodyHtml +
									'</body></html>'

					var file = new Blob([html], { type: "text/html" });
					var link = document.createElement("a");
					link.download = getReportFilename();
					link.href = URL.createObjectURL(file);
					link.click();
				}
			}]);
	});
