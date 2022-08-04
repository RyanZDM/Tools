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
			"adoComputedFiledService",

			function ($scope, $rootScope, $http, $q, adoAuthService, adoQueryService, adoRestApi, utility, currentSettings, adoComputedFiledService) {
				$scope.CanUseLocalStorage = adoAuthService.CanUseLocalStorage;
				$scope.SAVED_PARAMETERS = "Params_QryByWiql";
				$scope.QueryType = "flat";	// flat/tree/oneHop
				$scope.UserId = "";
				$scope.UserPwd = "";
				$scope.InQuerying = false;
				$scope.ErrorMsg = "";
				$scope.QueryTypeString = "";
				$scope.Select = "SELECT [System.Id],[System.WorkItemType],[System.Title],[System.AssignedTo],[System.State],[Custom.CSH_Release] FROM workitems";
				$scope.Where = "[System.State] <> 'Closed' AND [System.State] <> 'Rejected/Cancelled' AND [Custom.CSH_Release] = 'Jing-A (ImageView 1.12)' ORDER BY [Microsoft.VSTS.Common.StackRank]";
				$scope.CustomizedWhere = "wit['System.Parent']==508471";	//temp
				$scope.CustomizedScript = "RealAssign=(wit['System.AssignedTo'].displayName === 'Ryan ZHANG') ? 'Me' : 'Others'^RealState=(wit['System.State']==='Ready to Implement')? 'Ready' : 'Not Ready'";
				$scope.Headers = [];
				$scope.Columns = [];
				$scope.FullColumns = [];
				$scope.ComputedFields = [];
				$scope.Data = [];
				$scope.CpeRelated = false;
				$scope.CurrentWiql = "";
				$scope.PredefinedWiqlList = [];

				// Re-enable the Tooltip since the filtered the tasks changed
				$scope.$watch("filteredRecords", function () {
					$scope.enableHtmlFormatTooltip();
				});

				loadSavedParameters();

				getPredefinedWiql();

				function initBeforeQuery () {
					$scope.InQuerying = true;
					$scope.clearError();
					$scope.Data = [];

					saveCurrentParameters();
				};

				/**
				 * @name	query()
				 * @description	Get the ADO work item via WIQL
				 */
				$scope.query = function () {
					$scope.QueryTypeString = " --- Last query @" + new Date().toLocaleTimeString();
					initBeforeQuery();

					getColumns();

					// temp
					$scope.QueryType = "tree";

					$scope.CustomizedWhere = $scope.CustomizedWhere.trimStart().trimEnd();
					var wiql = $scope.Select + " Where " + $scope.Where;
					var parameters = { Wiql: wiql, QueryType: $scope.QueryType, ReturnFields: $scope.Columns, Token: adoAuthService.getAuthenticationToken(), ReturnType: ($scope.CpeRelated ? "WIT" : null) };
					if ($scope.CpeRelated) {
						var fieldString = parameters.ReturnFields.join(",").toLowerCase();

						// For CPE US, there are many info record in the Notes field
						if (fieldString.indexOf("custom.csh_notes") === -1) {
							parameters.ReturnFields.push("Custom.CSH_Notes");
						}

						if (fieldString.indexOf("system.workitemtype") === -1) {
							parameters.ReturnFields.push("System.WorkItemType");
						}

						if (fieldString.indexOf("system.areapath") === -1) {
							parameters.ReturnFields.push("System.AreaPath");
						}

						if (fieldString.indexOf("system.createddate") === -1) {
							parameters.ReturnFields.push("System.CreatedDate");
						}

						if (fieldString.indexOf("microsoft.vsts.common.closeddate") === -1) {
							parameters.ReturnFields.push("Microsoft.VSTS.Common.ClosedDate");
						}
					}
					var hasCustomizedField = ($scope.ComputedFields.length > 0);
					adoQueryService.pureWiqlQuery(parameters)
						.then(function (result) {
							result.forEach(function (wit) {
								if (hasCustomizedField) {
									// Calculate the computed fields
									adoComputedFiledService.updateCustomizedFields(wit, $scope.ComputedFields);
								}

								$scope.FullColumns.forEach(function (col) {
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

							// Filter by the customized where clause
							if ($scope.CustomizedWhere !== "") {
								result = _.filter(result, (wit) => {
									return eval($scope.CustomizedWhere);
								});
							}

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

				$scope.getAdoQuerys = function () {
					var parameters = { QueryId: "32dd8e9d-f515-4e4f-a6ea-824ece0fabda", Token: adoAuthService.getAuthenticationToken() };
					adoQueryService.getWiqlOfNameqdQuery(parameters).then(function(result) {
						var clause = result.wiql.split(/where/gi);
						$scope.Select = clause[0];
						$scope.Where = clause[1];
						
					}, function (error) {
						reportError(error);
					});
				}

				function getColumns() {
					var select = $scope.Select.trimStart().trimEnd();
					var regex = new RegExp("^Select", "i");
					if (!regex.test(select)) return;

					var pos = select.toLowerCase().indexOf("from");
					if (pos === -1) return;
					
					var columns = select.substr(7, pos - 7)
										.replace(/\[|\]/gi, "")
										.split(",")
										.map(function(col) {
											return col.trimStart().trimEnd();
										});

					var headers = columns.map(function(col) {
						return col.split(".").pop();
					});

					var fullColumns = [].concat(headers);	// include the computed fields, not use the Columns filed
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
				 * @name	saveCurrentParameters()
				 * @description	Saves the current parameters to browser local cache
				 */
				function saveCurrentParameters() {
					if (!$scope.CanUseLocalStorage) return;

					var data = {
						Select: $scope.Select,
						Where: $scope.Where,
						CustomizedWhere: $scope.CustomizedWhere,
						CustomizedScript: $scope.CustomizedScript
					};

					localStorage.setItem($scope.SAVED_PARAMETERS, JSON.stringify(data));
				}

				/**
				 * @name	loadSavedParameters()
				 * @description	Loads saved parameters from browser local cache
				 */
				function loadSavedParameters() {
					if (!$scope.CanUseLocalStorage) return;

					var savedParameters = localStorage.getItem($scope.SAVED_PARAMETERS);
					if (!savedParameters || savedParameters.trim() === "") { return; }
					try {
						savedParameters = JSON.parse(savedParameters);

						if (savedParameters["Select"] !== undefined) { $scope.Select = savedParameters.Select; }
						if (savedParameters["Where"] !== undefined) { $scope.Where = savedParameters.Where; }
						if (savedParameters["CustomizedWhere"] !== undefined) { $scope.CustomizedWhere = savedParameters.CustomizedWhere; }
						if (savedParameters["CustomizedScript"] !== undefined) { $scope.CustomizedScript = savedParameters.CustomizedScript; }
					} catch (err) {
						reportError(err);
					}
				};

				function getPredefinedWiql() {
					$scope.PredefinedWiqlList = adoRestApi.PredefinedWiqlList;
				}

				$scope.applyWiql = function() {
					if ($scope.CurrentWiql === "") {
						$scope.Select = "";
						$scope.Where = "";
						$scope.CustomizedWhere = "";
						$scope.CustomizedScript = "";

						return;
					}

					var wiql = $scope.PredefinedWiqlList.find(function (item) {
						return $scope.CurrentWiql === item.Name;
					});

					if (wiql) {
						if (wiql.CpeRelated) {
							$scope.CpeRelated = wiql.CpeRelated;
						}
						$scope.Select = wiql.Select;
						$scope.Where = wiql.Where;
						$scope.CustomizedWhere = wiql.CustomizedWhere;
						$scope.CustomizedScript = wiql.CustomizedScript;
					}
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
						$scope.FullColumns.forEach(function(col) {
							var val = record[col] ? record[col] : "";
							if (col.toLowerCase().indexOf("version") !== -1) {
								val = "'" + val;
							}
							row = row + val + "\t";
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
					console.error(error);
					$scope.ErrorMsg = error;
				};
			}]);
	});
