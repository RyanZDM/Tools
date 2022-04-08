"use strict";

define(["app", "underscore", "jquery"],
	function (app, _, $) {
		app.controller("queryByWiqlController", [
			"$scope",
			"$rootScope",
			"$http",
			"$q",
			"adoAuthService",
			"adoQueryService",
			"adoRestApi",
			"utility",
			"currentSettings",
			"LocalStorageKey",
			"adoComputedFiledService",

			function ($scope, $rootScope, $http, $q, adoAuthService, adoQueryService, adoRestApi, utility, currentSettings, LocalStorageKey, adoComputedFiledService) {
				$scope.CanUseLocalStorage = adoAuthService.CanUseLocalStorage;
				$scope.UserId = "";
				$scope.UserPwd = "";
				$scope.InQuerying = false;
				$scope.ErrorMsg = "";
				$scope.QueryTypeString = "";
				$scope.Select = "SELECT [System.Id],[System.WorkItemType],[System.Title],[System.AssignedTo],[System.State],[Custom.CSH_Release],[Custom.CSH_SignoffNA],[Custom.CSH_SignoffDIDRequirementsApproved],[Custom.CSH_SignoffHLDUseCasesApproved],[Custom.CSH_SignoffUCDSpecApproved],[Custom.CSH_SignoffTestDesignApproved],[Custom.CSH_SignoffFinalFeatureReviewComplete] FROM workitems";
				$scope.Where = "[System.WorkItemType] = 'Feature' AND [System.State] <> 'Closed' AND [System.State] <> 'Rejected/Cancelled' AND [Custom.CSH_Release] = 'Jing-A (ImageView 1.12)' ORDER BY [Microsoft.VSTS.Common.StackRank]";
				$scope.CustomizedScript = "RealAssign=(wit['System.AssignedTo'].displayName === 'Ryan ZHANG') ? 'Me' : 'Others'^RealState=(wit['System.State']==='Ready to Implement')? 'Ready' : 'Not Ready'";
				$scope.Headers = [];
				$scope.Columns = [];
				$scope.FullColumns = [];
				$scope.ComputedFields = [];
				$scope.Data = [];

				// Re-enable the Tooltip since the filtered the tasks changed
				$scope.$watch("filteredRecords", function () {
					$scope.enableHtmlFormatTooltip();
				});

				function initBeforeQuery () {
					$scope.InQuerying = true;
					$scope.clearError();
					$scope.Data = [];
				};

				/**
				 * @name	query()
				 * @description	Get the ADO work item via WIQL
				 */
				$scope.query = function () {
					$scope.QueryTypeString = " --- Last query @" + new Date().toLocaleTimeString();
					initBeforeQuery();

					getColumns();

					var wiql = $scope.Select + " Where " + $scope.Where;
					var parameters = { Wiql: wiql, ReturnFields: $scope.Columns, Token: adoAuthService.getAuthenticationToken() };
					var hasCustomizedField = ($scope.ComputedFields.length > 0);
					adoQueryService.pureWiqlQuery(parameters)
						.then(function (result) {
								result.forEach(function(wit) {
									if (hasCustomizedField) {
										// Calculate the computed fields
										adoComputedFiledService.updateCustomizedFields(wit, $scope.ComputedFields);
									}

									$scope.FullColumns.forEach(function(col) {
										var val = wit[col];
										var valType = typeof val;
										switch (valType) {
										case "string":
											wit[col] = utility.html2PlainText(wit[col]);
											break;
										case "object":
											if (val["displayName"]) {
												wit[col] = val["displayName"];
											}
											break;
										default:
										}
									});
								});

								$scope.Data = result;
							},
							function (error) {
								reportError(error);
							})
						.then(function () {
							$scope.InQuerying = false;
							$scope.enableHtmlFormatTooltip();
							$scope.$apply();
						});
				};

				function getColumns() {
					var select = $scope.Select.trimStart().trimEnd();
					var regex = new RegExp("^Select", "i");
					if (!regex.test(select)) return [];

					var pos = select.toLowerCase().indexOf("from");
					if (pos === -1) return [];
					
					var columns = select.substr(7, pos - 7)
										.replace(/\[|\]/gi, "")
										.split(",")
										.map(function(col) {
											return col.trimStart().trimEnd();
										});

					var headers = columns.map(function(col) {
						return col.split(".").pop();
					});

					var fullColumns = [].concat(columns);	// include the computed fields
					$scope.ComputedFields = adoComputedFiledService.getComputedFields($scope.CustomizedScript);
					$scope.ComputedFields.forEach(function(cf) {
						headers.push(cf.Field);
						fullColumns.push(cf.Field);
					});

					$scope.Columns = columns;
					$scope.FullColumns = fullColumns;
					$scope.Headers = headers;
				}

				/**
				 * @name	enableHtmlFormatTooltip()
				 * @description	Enables the HTML format Tooltip
				 */
				$scope.enableHtmlFormatTooltip = function () {
					setTimeout(function () {
						$('[data-html="true"]').tooltip();
					}, 100);
				};

				$scope.export = function() {
					if (!$scope.Data || $scope.Data.length < 1 
						|| !$scope.Headers || $scope.Headers.length < 1 
						|| !$scope.Columns || $scope.Columns.length < 1) return;

					var header = "";
					$scope.Headers.forEach(function(col) {
						header = header + col + "\t";
					});

					header = header.substr(0, header.length - 1);

					var rows = "";
					$scope.Data.forEach(function(record) {
						var row = "";
						$scope.Columns.forEach(function(col) {
							row = row + (record[col] ? record[col] : "") + "\t";
						});

						// remove last tab
						row = row.substr(0, row.length - 1);

						rows = rows + row + "\r\n";
					});

					var exportTxt = header + "\r\n" + rows;
					window.alert(utility.copyToClipboard(exportTxt) ? "Data get copied to clipboard." : "Copy to clipboard failed.");
				};

				$scope.clearError = function() {
					$scope.ErrorMsg = "";
				};

            	/**
				 * @name	reportError
				 * @description	Reports an error
				 * @param	error	The error object.
				 */
				function reportError(error) {
					var errorMsg = "";

					if (error.status == 401) {
						errorMsg = "incorrect user name or password";
					} else {
						if (error.statusText !== "") {
							errorMsg = error.statusText;
						} else {
							errorMsg = error.toString();
						}
					}

					console.error(errorMsg);
					$scope.ErrorMsg = errorMsg;
				};
			}]);
	});
