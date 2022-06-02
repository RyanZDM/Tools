"use strict";

define(["app", "underscore", "jquery"],
	function (app, _, $) {
		app.controller("adoTaskController", [
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
				$scope.RALLY_INTERNAL_ERROR = "RallyInternalError";
				$scope.CanUseLocalStorage = adoAuthService.CanUseLocalStorage;
				$scope.FeatureList = [];
				$scope.UserId = "";
				$scope.UserPwd = "";
				$scope.InQuerying = false;
				$scope.ErrorMsg = "";
				$scope.QueryTypeString = "";

				$scope.Dev = {
					QueryTypeString: "",
					TaskList: [],
					Sprint: 0,
					Owner: "",
					EmailList: Object.values(currentSettings.OwnerEmailMapping),
					OwnerNameList: Object.keys(currentSettings.OwnerEmailMapping),
					IfSaveOtherInfo2Local: true,
					OtherInfoLabel: "Comments",
					LastFilteredCount: 0,
					LastRecordCount: 0,
					ShowUnassignedOnly: false,
					SDCOnly: false,
					CurrentTeamOnly: true,
					CurrentTeam: currentSettings.Team,
					CurrentTeamShortName: currentSettings.TeamShortName,
					DEOnly: false,
					ShowCurrentRelease: true,
					CurrentRelease: currentSettings.Release,
					Show2ndRelease: true,
					SecondRelease: currentSettings.SecondRelease,
					ShowOthers: false,
					ShowNew: true,
					ShowAssigned: true,
					ShowActive: true,
					ShowResolved: true,
					ShowClosed: true,
					SHowFailedOnly: false,
					ShowRejectedDefects: true,
					ShowFeatureField: true,
					QueryForOpenDefect: false,
					DeOrUs: "ALL",
					ShowProductField: true,
					ShowIterationField: true,
					ShowRejectField: true,
					ShowBlockReasonField: true,
					ShowInvalidItemOnly: false,
					ShowCompleteDate: true,

					OrderByOptions: [{ value: 0, name: "Default" },
						{ value: 1, name: "Priority" },
						{ value: 2, name: "State" },
						{ value: 3, name: "Feature" },
						{ value: 4, name: "Completed Date" }
					],
					OrderByValues: [["Owner", "Iteration", "-State", "Priority"],
						["Priority", "-State"],
						["-State", "Priority"],
						["Feature", "-State", "Priority"],
						["-CompleteDate"]
					],
					OrderByOptionIndex: 0,
					ProjectTeamList: ["Taiji", "Wudang", "Penglai", "Dunhuang", "CPE"],

					WorkloadStat: {
						Collected: false,
						Workload: [],
						ChartData: []
						, Name: "DevWorkLoadSummary"
						, ChartName: "DevWorkLoadSummary_Chart"
						, Headers: ["Name", "Count", "Story Points", "Completed Hours"]
						, Columns: ["Owner", "Count", "Points", "CompletedHours"]
						, ChartTitle: "Workload statistics by person"
					},

					/**
					 * @name	refreshTaskList() call by refreshSingle and refreshAll
					 */
					refreshTaskList: function (owner) {
						$scope.Dev.QueryTypeString = (owner & owner !== "") ?
							" --- " + owner + "'s ADO task in sprint " + $scope.Dev.Sprint + " @" + new Date().toLocaleTimeString()
							: " --- ADO task in sprint " + $scope.Dev.Sprint + " for ALL person @" + new Date().toLocaleTimeString();

						var parameters = { Owners: owner, Sprint: $scope.Dev.Sprint, Teams: $scope.Dev.CurrentTeam };
						getAdoTask(parameters, $scope.Dev.callbackBeforeQuery, function (result, token) {
							$scope.Dev.TaskList = result;

							setTimeout(() => {
								$scope.Dev.TaskList.forEach(wit => {
									loadSubTaskState(wit, token).then(result => {
										wit.ChildrenTooltip = generateHtmlFormatTableData(result, ["Estimate", "Completed"]);

										$scope.$apply();
									})
								})
							}, 0);
						});
					},

					/**
					 * @name	refreshSingle()
					 * @description	Get the task list of specified engineer from ADO, save to $scope.Dev.TaskList
					 */
					refreshSingle: function () {
						$scope.Dev.refreshTaskList($scope.Dev.Owner);
					},

					/**
					 * @name	refreshAll()
					 * @description	Gets the task list of all engineers from ADO, save to $scope.Dev.TaskList
					 */
					refreshAll: function () {
						$scope.Dev.refreshTaskList("");
					},

					resetWorkloadStat: function () {
						$scope.Dev.WorkloadStat.Collected = false;
						initChart($scope.Dev.WorkloadStat);
					},

					/**
					 * @name	getOpenDefects
					 * @descriptions	Gets all open defects of current project
					 * @param release	The release name
					 */
					getOpenDefects: function (release) {
						var project = adoRestApi.getRelease(release);
						if (!project) {
							reportError("Please specify the release for querying open defect");
							return;
						}

						initBeforeQuery(callbackBeforeQuery);

						var token = adoAuthService.getAuthenticationToken();

						$scope.Dev.QueryForOpenDefect = true;
						$scope.Dev.QueryTypeString = " --- ALL " + project.Name + " open tasks @" + new Date().toLocaleTimeString();

						var parameters = { Token: token, States: ["Submitted", "New", "Assigned", "Active"] };
						_.extend(parameters, project.Parameters)
						adoQueryService.getAdoTaskUsingWiql(parameters).then(function (list) {
							$scope.Dev.TaskList = project.process(list);

							// Load the other info from local storage
							loadSavedParameters();
						},
							function (error) {
								reportError(error);
							})
							.then(function () {
								$scope.InQuerying = false;
								$scope.$apply();
								$scope.enableHtmlFormatTooltip();
							});
					},

					/**
					 * @name	scheduleStateFilter()
					 * @description	Schedule state filter
					 * @param	task	The task record to be filtered.
					 * @returns	false if do not want to show
					 */
					scheduleStateFilter: function (task) {
						if (!$scope.Dev.QueryForOpenDefect) {
							if (!$scope.ShowFakeTask && task.FakeTask) return false;

							var isCurrentRelease = adoRestApi.getCurrentRelease().inScope(task.CSH_Release);
							var is2ndRelease = adoRestApi.getSecondRelease().inScope(task.CSH_Release);
							var isOthers = !(isCurrentRelease || is2ndRelease);

							if (!$scope.Dev.ShowCurrentRelease && isCurrentRelease) return false;

							if (!$scope.Dev.Show2ndRelease && is2ndRelease) return false;

							if (!$scope.Dev.ShowOthers && isOthers) return false;
						}

						if ($scope.Dev.QueryForOpenDefect && $scope.Dev.ShowUnassignedOnly && task.Owner !== "") return false;

						var isBug = (task.WorkItemType === "Bug");

						if (!isBug && $scope.Dev.DeOrUs === "DE Only") return false;

						if (isBug && $scope.Dev.DeOrUs === "US Only") return false;

						if ($scope.Dev.CurrentTeamOnly) {
							if (task.AreaPath & task.AreaPath.indexOf(currentSettings.Team) < 0) return false;
						}

						if ($scope.Dev.SDCOnly) {
							if (!task.Owner || task.Owner === "") return false;
							var owner = task.Owner.toLowerCase();
							var find = $scope.Dev.OwnerNameList.find(function (data) {
								return owner === data.toLowerCase();
							});

							if (!find) return false;
						}

						if ($scope.Dev.ShowInvalidItemOnly) {
							return (task.AcMissed
								|| task.RequiredFieldMissed
								|| task.WrongOwner
								|| task.WorkingHoursMissed);
						}

						if (!$scope.Dev.ShowRejectedDefects && (task.Reject || task.Postpone || task.Duplicate)) return false;

						if ($scope.Dev.ShowFailedOnly) {
							return task.EverFailed;
						}

						switch (task.State) {
							case "Resolved":
								return $scope.Dev.ShowResolved;
							case "Closed":
							case "Verified":
								return $scope.Dev.ShowClosed;
							case "Active":
								return $scope.Dev.ShowActive;
							case "Assigned":
								return $scope.Dev.ShowAssigned;
							case "New":
							case "Submitted":
								return $scope.Dev.ShowNew;
						}

						return false;
					},

					/**
					 * @name	collectWorkloadStatData
					 * @description	Summarize the total estimation days, working hours and task count by engineer
					 * @returns	True if the workload stat data is generated successfully. False if no data.
					 */
					collectWorkloadStatData: function () {
						if (!$scope.filteredRecords) {
							initChart($scope.Dev.WorkloadStat);
							return false;
						}

						if ($scope.Dev.WorkloadStat["Collected"] && $scope.Dev.WorkloadStat.Collected) {
							return true;
						};

						if ($scope.filteredRecords.length > 0) {
							var result = $scope.filteredRecords.reduce(function (total, task) {
								var owner = task.Owner;
								var storyPoints = (task.StoryPoints) ? task.StoryPoints : 0;
								var completedHours = task.CompletedHours;
								if (!(owner in total)) {
									total[owner] = { Points: storyPoints, Count: 1, CompletedHours: 0 };
								} else {
									total[owner].Points += storyPoints;
									total[owner].Count += 1;
									total[owner].CompletedHours += completedHours;
								}

								return total;
							}, {});

							var orderedData = _.map(Object.keys(result),
								function (key) {
									return { Owner: key, Points: result[key].Points, Count: result[key].Count, CompletedHours: result[key].CompletedHours }
								});

							// Order by Points, order by Count desc
							orderedData.sort(function (a, b) {
								if (a.Points > b.Points) {
									return -1;
								} else if (a.Points === b.Points) {
									return (b.Count - a.Count);
								} else { return 1; }
							});

							updateChart($scope.Dev.WorkloadStat, orderedData, "Owner", ["Points", "Count", "CompletedHours"], ["Count", "Points", "Completed Hours"]);
						}

						$scope.Dev.WorkloadStat.Collected = true;

						return true;
					},

					/**
					 * @name	getWorkload
					 * @description	Accumulate the total estimation days and actual working hours 
					 * @param	records	The records to accumulate.
					 * @returns	The accumulate result string.
					 */
					getWorkload: function (records) {
						// TODO:
						var result = "";
						if (records && records.length > 0) {
							var totalDays = 0, actualHours = 0;
							_.each(records,
								function (record) {
									if (record.StoryPoints) {
										totalDays = totalDays + record.StoryPoints;
									}

									if (record.Actuals) {
										actualHours = actualHours + (record.Actuals ? record.Actuals : 0);
									}
								});

							result = "-- Est. Days:" + totalDays + " | Act. Hours:" + Math.round(actualHours);
						}

						return result;
					},

					/**
					 * Saves the project team settings to local storage
					 */
					saveCurrentProjectTeamToLocalStorage: function () {
						var data = {
							Team: $scope.Dev.CurrentTeam,
							TeamShortName: $scope.Dev.CurrentTeamShortName
						}

						currentSettings.saveSettingsToLocalStorage(data);
					},

					/**
					 * Gets called when user changed the current project team
					 * @param {any} team
					 */
					projectTeamChanged: function (team) {
						var shortName = team;
						$scope.Dev.CurrentTeamShortName = shortName;
					},

					orderChanged: function () {
						$scope.Dev.OrderByValue = $scope.Dev.OrderByValues[$scope.Dev.OrderByOptionIndex];
					},

					callbackBeforeQuery: function () {
						// Record the last time record count so that we know if have changes between two query
						$scope.Dev.LastRecordCount = $scope.Dev.TaskList.length;
						$scope.Dev.LastFilteredCount = $scope.filteredRecords ? $scope.filteredRecords.length : 0;
						$scope.Dev.TaskList = [];
						$scope.Dev.resetWorkloadStat();
						$scope.Dev.QueryForOpenDefect = false;
					}
				};

				//#region Dev data init
				$scope.Dev.OrderByValue = $scope.Dev.OrderByValues[0];

				// Re-enable the Tooltip since the filtered the tasks changed
				$scope.$watch("filteredRecords", function () {
					$scope.enableHtmlFormatTooltip();
				});
				//#endregion Dev data init end

				$scope.CPE = {
					QueryTypeString: "",
					CreatedAfter: new Date(moment().startOf("month")),
					SpecialDateRange: "",
					TaskList: [],
					OrderByOptionIndex: 0,
					OrderByOptions: [{ value: 0, name: "Default" },
						{ value: 1, name: "Priority" },
						{ value: 2, name: "State" },
						{ value: 3, name: "Open Days" },
						],

					OrderByValues: [["Owner", "State", "Priority"],
						["Priority", "State"],
						["State", "Priority"],
						["-CPEInfo.OpenWorkingDays", "State", "Priority"],
					],

					Headers: ["ADO ID", "Site", "Title", "State", "Priority", "Created", "Assigned TO", "Blocked", "Closed", "Open Days", "Escalation Id", "Ver", "Product"],
					Columns: ["Id", "CPEInfo.site", "Title", "State", "Priority", "CreatedDate", "Owner", "Blocked", "ClosedDate", "CPEInfo.OpenWorkingDays", "EscalationId", "CSHSoftwareVersion", "CSH_ProductFamily"],
					ComputedFieldScript: "ProdctAndVer=(wit.CPEInfo.modality + '/' + wit.CSH_ProductFamily + wit.CSHSoftwareVersion)",//DoubleDays=(wit.CPEInfo.OpenWorkingDays * 2)^<column 2>",
					ComputedFields: [],// will be updated by ComputedFieldScript

					WorkloadStat: {
						Collected: false,
						Workload: [], ChartData: []
						, Name: "CPEWorkloadSummaryByDays"
						, Headers: ["Name", "Count", "Story Points"]
						, Columns: ["Owner", "Count", "StoryPoints"]
						, ChartName: "CPEWorkloadSummaryByDays_Chart"
						, ChartTitle: "Workload by Person"
					},

					CatalogStat: {
						Workload: [], ChartData: []
						, Name: "CPEStatisticsByCatalog"
						, ChartName: "CPEStatisticsByCatalog_Chart"
						, Headers: ["Catalog", "Count"]
						, Columns: ["catalog", "Count"]
						, ChartTitle: "IV CPE Issue Group by Catalog"
						, ChartSeries: ["<unspecified>", "Evo", "Revo", "Compass", "Ascend", "Transportable"]
						, ChartOptions: {
							scales: {
								yAxes: [{
									stacked: true
								}],
								xAxes: [{
									stacked: true
								}]
							}
						},
					},

					ShowNew: true,
					ShowAssigned: true,
					ShowActive: true,
					ShowResolved: true,
					ShowClosed: true,
					ShowProduct: "All",

					specialDateRangeChanged: function (source) {
						switch (source) {
							case "FixedDate":
								$scope.CPE.SpecialDateRange = "";
								break;
							case "Range":
								var today = moment();
								switch ($scope.CPE.SpecialDateRange) {
									case "curr_week":
										$scope.CPE.CreatedAfter = new Date(today.startOf('week'));
										break;
									case "within_week":
										$scope.CPE.CreatedAfter = new Date(today.add(-7, "days"));
										break;
									case "curr_month":
										$scope.CPE.CreatedAfter = new Date(today.startOf('month'));
										break;
									case "within_month":
										$scope.CPE.CreatedAfter = new Date(today.add(-1, "months"));
										break;
									case "none":
									case "":
										break;
								}

								break;
						}
					},

					orderChanged: function () {
						$scope.CPE.OrderByValue = $scope.CPE.OrderByValues[$scope.CPE.OrderByOptionIndex];
					},

					dataFilter: function (record) {
						switch ($scope.CPE.ShowProduct) {
							case "DvIv":
								if (record["CSH_ProductFamily"] !== "IV" && record["CSH_ProductFamily"] !== "DV") return false;
								break;
							case "IV":
								if (record["CSH_ProductFamily"] !== "IV") return false;
								break;
							case "DV":
								if (record["CSH_ProductFamily"] !== "DV") return false;
								break;
							case "IS":
								if (record["CSH_ProductFamily"] !== "IS") return false;
								break;
						};

						switch (record.State) {
							case "Resolved":
								return $scope.CPE.ShowResolved;
							case "Closed":
							case "Verified":
								return $scope.CPE.ShowClosed;
							case "Active":
								return $scope.CPE.ShowActive;
							case "Assigned":
								return $scope.CPE.ShowAssigned;
							case "New":
							case "Submitted":
								return $scope.CPE.ShowNew;
						}

						return true;
					},

					query: function () {
						$scope.CPE.QueryTypeString = " --- ALL CPE Tasks @" + new Date().toLocaleTimeString();

						var parameters = { CreatedAfter: moment($scope.CPE.CreatedAfter).format("YYYY-MM-DD"), WorkItemType: "User Story", Teams: "CPE" };
						getAdoTask(parameters, null, function (result, token) {
							var hasCustomizedField = ($scope.CPE.ComputedFields.length > 0);

							result.forEach(function (record) {
								if (hasCustomizedField) {
									// Calculate the computed fields
									adoComputedFiledService.updateCustomizedFields(record, $scope.CPE.ComputedFields);
								}

								record["CreatedDate"] = moment.utc(record["CreatedDate"], "YYYY-MM-DDTHH:mm:ss.SSS").local().format("YYYY-MM-DD");
								if (record["ClosedDate"] && record["ClosedDate"] !== "") {
									record["ClosedDate"] = moment.utc(record["ClosedDate"], "YYYY-MM-DDTHH:mm:ss.SSS").local().format("YYYY-MM-DD");
								}
							});

							$scope.CPE.TaskList = result;

							// TODO: Calculate the working hours background
							setTimeout(() => {
								$scope.CPE.TaskList.forEach(wit => {
									loadSubTaskState(wit, token).then(result => {
										wit.ChildrenTooltip = generateHtmlFormatTableData(result, ["Estimate", "Completed"]);

										$scope.$apply();
									})
								})
							}, 0);
						});
					},

					/**
					 * @name	collectWorkloadStatData
					 * @description	Summarize the total estimation days, working hours and task count by engineer
					 * @returns	True if the workload stat data is generated successfully. False if no data.
					 */
					collectWorkloadStatData: function () {
						return collectWorkloadStatData($scope.CPE.WorkloadStat, $scope.filteredCpeRecords, ["Points", "Tasks Total"])
					},

					resetWorkloadStat: function () {
						$scope.CPE.WorkloadStat.Collected = false;
						initChart($scope.CPE.WorkloadStat);
					},

					/**
					 * @name getStatistics
					 * @description Gets the CPE statistics by owner and team
					 */
					getStatistics: function () {
						$scope.InQuerying = true;
						$scope.clearError();

						initChart($scope.CPE.CatalogStat);

						var token = adoAuthService.getAuthenticationToken();
						adoQueryService.getCpeStatistics({ Token: token })
							.then(function (result) {
								if (result.length > 0) {
									$scope.CPE.CatalogStat.DateRange = {
										Begin: result[0].CreatedDate.substr(0, 10),
										End: result[result.length - 1].CreatedDate.substr(0, 10)
									};
								}

								var catalogStat = utility.groupByMultiple(result, [function (ceil) {
									return ceil.CPEInfo.catalog;
								}, function (ceil) {
									return ceil.CPEInfo.modality;
								}], [], true, false);	// catalog and modality have been formated already

								catalogStat = Object.keys(catalogStat)
									.map(function (catalog) {
										var row = catalogStat[catalog];
										var ret = { catalog: catalog, Count: row.__Count, Others: 0 };
										$scope.CPE.CatalogStat.ChartSeries.forEach(series => {
											ret[series] = 0;
										})

										Object.keys(row).forEach(key => {
											if (key.startsWith("__")) { return; }

											var found = false;
											var lowerKey = key.toLowerCase();
											$scope.CPE.CatalogStat.ChartSeries.forEach(series => {
												if (lowerKey === series.toLowerCase()) {
													ret[series] = row[key].__Count;
													found = true;
												}
											})

											if (!found) {
												ret.Others += row[key].__Count;
											}
										})

										return ret;
									})
									.sort(function (first, second) {
										if (second.Count !== first.Count) {
											return second.Count - first.Count;
										} else {
											return first.catalog.localeCompare(second.catalog);
										}
									});
								// temp, remove the <unspecified> catalog
								catalogStat = catalogStat.filter((row) => row.catalog !== '<unspecified>');

								$scope.CPE.CatalogStat.CatalogData = catalogStat;
								//updateChart($scope.CPE.CatalogStat, catalogStat, "catalog", ["Count"]);
								updateChart($scope.CPE.CatalogStat, catalogStat, "catalog", $scope.CPE.CatalogStat.ChartSeries.concat(["Others"]));

								// Group by top 3 catalogs
								var ignoreList = ["hw-fw", "detector"];
								for (var i = 0, total = 0; total < 3; i++) {
									var catalog = (catalogStat[i].catalog).toLowerCase();
									if (ignoreList.findIndex((cat) => cat === catalog) === -1) {
										total++;
										let catalog = (catalogStat[i].catalog);
										let chartName = $scope.CPE.CatalogStat.ChartName + "_" + total;
										setTimeout(() => {
											$scope.CPE.groupByModalityAndMonth(result, catalog, chartName);
										}, 0);
									}
								}
							},
								function (error) {
									reportError(error);
								})
							.then(function () {
								$scope.InQuerying = false;
								$scope.$apply();
							});
					},

					groupByModalityAndMonth: function (result, catalog, chartName) {
						var chart = {
							Name: chartName,
							ChartName: chartName,
							ChartTitle: "[<catalog>] by Month & Product".replace("<catalog>", catalog),
							ChartLabels: [],
							ChartData: [],
							ChartOptions: {
								scales: {
									yAxes: [{
										stacked: true
									}],
									xAxes: [{
										stacked: true
									}]
								}
							}
						};

						var list = result.filter((row) => row.CPEInfo.catalog === catalog)
						if (list.length > 0) {
							chart.DateRange = {
								Begin: list[0].CreatedDate.substr(0, 10),
								End: list[list.length - 1].CreatedDate.substr(0, 10)
							};
						}

						$scope.CPE.CatalogStat.DateRange = {
							Begin: result[0].CreatedDate.substr(0, 10),
							End: result[result.length - 1].CreatedDate.substr(0, 10)
						}

						list = utility.groupByMultiple(list,
							[function (ceil) {
								return ceil.Created.YearMonth;
							}
								, function (ceil) {
									return ceil.CPEInfo.modality;
								}]
							, [], true, false);

						list = Object.keys(list).map((month) => {
							var row = list[month];
							var ret = { Month: month, Count: row.__Count, Others: 0 };
							$scope.CPE.CatalogStat.ChartSeries.forEach(series => {
								ret[series] = 0;
							})

							Object.keys(row).forEach(key => {
								if (key.startsWith("__")) { return; }

								var found = false;
								var lowerKey = key.toLowerCase();
								$scope.CPE.CatalogStat.ChartSeries.forEach(series => {
									if (lowerKey === series.toLowerCase()) {
										ret[series] = row[key].__Count;
										found = true;
									}
								})

								if (!found) {
									ret.Others += row[key].__Count;
								}
							})

							return ret;
						})
							.sort((first, second) => {
								return first.Month.localeCompare(second.Month);
							});

						var valueColumns = $scope.CPE.CatalogStat.ChartSeries.concat(["Others", "Count"]);
						var seriesConfigs = $scope.CPE.CatalogStat.ChartSeries.concat(["Others"]);
						seriesConfigs.push({
							label: "Count"
							, type: "line"
							, fill: false
							, borderWidth: 2
							, borderColor: "#000000"
						});
						updateChart(chart, list, "Month", valueColumns, seriesConfigs);
					}
				};

				//#region CPE data init
				$scope.CPE.OrderByValue = $scope.CPE.OrderByValues[0];
				// For computed fields
				$scope.CPE.ComputedFields = adoComputedFiledService.getComputedFields($scope.CPE.ComputedFieldScript);
				$scope.CPE.FullColumns = [].concat($scope.CPE.Columns).concat($scope.CPE.ComputedFields.map(cfg => { return cfg.Field }));
				if ($scope.CPE.FullColumns.length > $scope.CPE.Headers.length) {
					var end = $scope.CPE.FullColumns.length;
					for (var i = $scope.CPE.Headers.length; i < end; i++) {
						$scope.CPE.Headers.push($scope.CPE.FullColumns[i]);
					}
				}

				// Re-enable the Tooltip since the filtered the tasks changed
				$scope.$watch("filteredCpeRecords", function () {
					$scope.enableHtmlFormatTooltip();
				});
				//#endregion CPE data init end

				//#region Statistics
				$scope.workingHoursStatOwner = {
					Workload: [], ChartData: []
					, Name: "workingHoursStatOwnerTableChart"
					, Headers: ["Name", "Completed Hours", "Task Count"]
					, Columns: ["Owner", "CompletedWork", "Count"]
					, ChartName: "workingHoursStatOwnerTableChart_Chart"
					, ChartTitle: "Working Hours Statistics by Owner"
				};

				$scope.workingHoursStatTeam = {
					Workload: [], ChartData: []
					, Headers: ["Team", "Completed Hours", "Task Count"]
					, Columns: ["Team", "CompletedWork", "Count"]
					, Name: "workingHoursStatTeamTableChart"
					, ChartName: "workingHoursStatTeamTableChart_Chart"
					, ChartTitle: "Working Hours Statistics by Team"
				};

				//#endregion Statistics

				$scope.currentTab = "FeatureTeam";
				$scope.switchTab = function (tabName) {
					$scope.currentTab = tabName;
				}

				$scope.getRowData = function (row, colName) {
					return utility.getRowData(row, colName);
				};

				loadSavedParameters();

				/**
				 * @name	saveCurrentParameters()
				 * @description	Saves the current parameters (owner, sprint, scope etc.) to browser local cache
				 */
				function saveCurrentParameters() {
					if (!$scope.CanUseLocalStorage) { return; }

					var data = {
						Owner: $scope.Dev.Owner,
						Sprint: $scope.Dev.Sprint,
						Show2ndRelease: $scope.Dev.Show2ndRelease,
						ShowCurrentRelease: $scope.Dev.ShowCurrentRelease,
						ShowOthers: $scope.Dev.ShowOthers,
						IfSaveOtherInfo2Local: $scope.Dev.IfSaveOtherInfo2Local,
						OtherInfoLabel: $scope.Dev.OtherInfoLabel,
						ShowProductField: $scope.Dev.ShowProductField,
						ShowIterationField: $scope.Dev.ShowIterationField,
						ShowRejectField: $scope.Dev.ShowRejectField,
						ShowBlockReasonField: $scope.Dev.ShowBlockReasonField,
						ShowNew: $scope.Dev.ShowNew,
						ShowAssigned: $scope.Dev.ShowAssigned,
						ShowActive: $scope.Dev.ShowActive,
						ShowResolved: $scope.Dev.ShowResolved,
						ShowClosed: $scope.Dev.ShowClosed,
						ShowCompleteDate: $scope.Dev.ShowCompleteDate,
					};

					localStorage.setItem(LocalStorageKey.SAVED_PARAMETERS, JSON.stringify(data));
				}

				/**
				 * @name	loadSavedParameters()
				 * @description	Loads saved parameters from browser local cache
				 */
				function loadSavedParameters() {
					if (!$scope.CanUseLocalStorage) { return; }

					var savedParameters = localStorage.getItem(LocalStorageKey.SAVED_PARAMETERS);
					if (!savedParameters || savedParameters.trim() === "") { return; }
					try {
						savedParameters = JSON.parse(savedParameters);

						if (savedParameters["Owner"] !== undefined) { $scope.Dev.Owner = savedParameters.Owner; }
						if (savedParameters["Sprint"] !== undefined) { $scope.Dev.Sprint = savedParameters.Sprint; }
						if (savedParameters["Show2ndRelease"] !== undefined) { $scope.Dev.Show2ndRelease = savedParameters.Show2ndRelease; }
						if (savedParameters["ShowCurrentRelease"] !== undefined) { $scope.Dev.ShowCurrentRelease = savedParameters.ShowCurrentRelease; }
						if (savedParameters["ShowOthers"] !== undefined) { $scope.Dev.ShowOthers = savedParameters.ShowOthers; }
						if (savedParameters["IfSaveOtherInfo2Local"] !== undefined) { $scope.Dev.IfSaveOtherInfo2Local = savedParameters.IfSaveOtherInfo2Local; }
						if (savedParameters["OtherInfoLabel"] !== undefined) { $scope.Dev.OtherInfoLabel = savedParameters.OtherInfoLabel; }
						if (savedParameters["ShowProductField"] !== undefined) { $scope.Dev.ShowProductField = savedParameters.ShowProductField; }
						if (savedParameters["ShowIterationField"] !== undefined) { $scope.Dev.ShowIterationField = savedParameters.ShowIterationField; }
						if (savedParameters["ShowRejectField"] !== undefined) { $scope.Dev.ShowRejectField = savedParameters.ShowRejectField; }
						if (savedParameters["ShowBlockReasonField"] !== undefined) { $scope.Dev.ShowBlockReasonField = savedParameters.ShowBlockReasonField; }
						if (savedParameters["ShowNew"] !== undefined) { $scope.Dev.ShowNew = savedParameters.ShowNew; }
						if (savedParameters["ShowAssigned"] !== undefined) { $scope.Dev.ShowAssigned = savedParameters.ShowAssigned; }
						if (savedParameters["ShowActive"] !== undefined) { $scope.Dev.ShowActive = savedParameters.ShowActive; }
						if (savedParameters["ShowResolved"] !== undefined) { $scope.Dev.ShowResolved = savedParameters.ShowResolved; }
						if (savedParameters["ShowClosed"] !== undefined) { $scope.Dev.ShowClosed = savedParameters.ShowClosed; }
						if (savedParameters["ShowCompleteDate"] !== undefined) { $scope.Dev.ShowCompleteDate = savedParameters.ShowCompleteDate; }

						if ($scope.Dev.IfSaveOtherInfo2Local && $scope.Dev.TaskList.length > 0) {
							var otherInfo = localStorage.getItem(LocalStorageKey.SAVED_OTHERINFO);
							if (!otherInfo) {
								return;
							}
							otherInfo = JSON.parse(otherInfo);
							_.each(_.keys(otherInfo),
								function (key) {
									updateOtherInfo($scope.Dev.TaskList, key, otherInfo[key]);
								});
						}
					} catch (err) {
						reportError(err);
					}
				};

				/**
				 * @name	updateOtherInfo
				 * @description Apply the comments according to id if it exist in list
				 * @param list	The task list
				 * @param id	The task ID
				 * @param value	The message to be updated
				 */
				function updateOtherInfo(list, id, value) {
					var index = _.findIndex(list, function (task) {
						if (!id || !task["id"]) return false;

						return (id.substring(0, 6).toLowerCase() === task.id.substring(0, 6).toLowerCase());
					});

					if (index > -1) {
						list[index].Other = value;
					}
				};

				function initBeforeQuery(callback) {
					if ($scope.FeatureList.length < 1) {
						// Load feature list
						adoQueryService.getFeatureList(adoAuthService.getAuthenticationToken())
							.then(function (list) {
								$scope.FeatureList = list;
							},
								function (e) {
									reportError(e);
								});
					}

					saveCurrentParameters();
					$scope.InQuerying = true;
					$scope.clearError();

					if (callback) {
						callback();
					}
				};

				/**
				 * @name	saveOtherInfo2Local()
				 * @description Saves the comments recorded in "Other" field to the local storage
				 */
				$scope.saveOtherInfo2Local = function () {
					if (!$scope.Dev.IfSaveOtherInfo2Local) {
						return;
					}

					var otherInfo = {};
					_.each($scope.Dev.TaskList,
						function (task) {
							if (task["Other"] && task.Other !== "") {
								otherInfo[task.id] = task.Other;
							}
						});

					localStorage.setItem(LocalStorageKey.SAVED_OTHERINFO, JSON.stringify(otherInfo));
				};

				/**
				 * @name exportOtherInfoFromLocal
				 * @description Exports the comments from local storage, then can import on another PC console
				 */
				$scope.exportOtherInfoFromLocal = function () {
					var otherInfo = localStorage.getItem(LocalStorageKey.SAVED_OTHERINFO);
					if (!otherInfo) {
						window.alert("Did not find the data in local storage.");
						return;
					}

					var file = new Blob([otherInfo], { type: "application/json" });
					var link = document.createElement("a");
					link.download = "adoTaskComments.dat";
					link.href = URL.createObjectURL(file);
					link.click();
				}

				/**
				 * @name importOtherInfo2Local
				 * @description Imports the comments exported from another PC
				 */
				$scope.importOtherInfo2Local = function () {
					var input = document.createElement("input");
					input.type = "file";
					input.onchange = function (e) {
						var file = e.target.files[0];
						var reader = new FileReader();
						reader.onload = function (e) {
							var content = e.target.result;
							var otherInfo = JSON.parse(content);

							_.each(_.keys(otherInfo),
								function (key) {
									updateOtherInfo($scope.Dev.TaskList, key, otherInfo[key]);
								});

							localStorage.setItem(LocalStorageKey.SAVED_OTHERINFO, JSON.stringify(otherInfo));
						}
						reader.readAsText(file, "UTF-8");
					};
					input.click();
				}

				/**
				 * @name clearCache
				 * @description Clear all cached info (except for the account info) from the local storage
				 */
				$scope.clearCache = function () {
					if (confirm("This will clear all ADO related cache from this machine, are you sure?")) {
						localStorage.removeItem(LocalStorageKey.LOCAL_STORAGE_KEY);
						localStorage.removeItem(LocalStorageKey.SAVED_PARAMETERS);
						localStorage.removeItem(LocalStorageKey.SAVED_OTHERINFO);
					}
				}

				/**
				 * @name	getAdoTask()
				 * @description	Get the ADO task according to the specified parameters. Called by refreshTaskList() and refreshAll(). Call by others internally
				 * @param	parameters	Options for querying the tasks from ADO.
				 * @param callbackBeforeQuery	the callback function before query
				 * @param callbackAfterQuery(result, token)	the callback function after data returned
				 */
				function getAdoTask(parameters, callbackBeforeQuery, callbackAfterQuery) {
					initBeforeQuery(callbackBeforeQuery);

					var token = adoAuthService.getAuthenticationToken();
					_.extend(parameters, { Token: token });
					adoQueryService.getAdoTaskUsingWiql(parameters)
						.then(function (result) {
							if (callbackAfterQuery) {
								callbackAfterQuery(result, token);
							}

							// Load the other info from local storage
							loadSavedParameters();

						}, function (error) {
							console.error("refreshTaskList() failed");
						})
						.then(function () {
							$scope.InQuerying = false;
							$scope.enableHtmlFormatTooltip();
							$scope.$apply();
						});
				};

				/**
				* @name	collectWorkloadStatData
				* @description	Summarize the total estimation days, working hours and task count by engineer
				* @returns	True if the workload stat data is generated successfully. False if no data.
				*/
				function collectWorkloadStatData(workladStat, filteredRecords, chartSeries) {
					if (workladStat["Collected"] && workladStat.Collected) {
						return true;
					};

					initChart(workladStat);

					if (!filteredRecords) {
						return false;
					}

					if (filteredRecords.length > 0) {
						var result = filteredRecords.reduce(function (total, task) {
							var storyPoints = (task.StoryPoints) ? task.StoryPoints : 0;
							if (!(task.Owner in total)) {
								total[task.Owner] = { Points: storyPoints, Count: 1 };
							} else {
								total[task.Owner].Points += storyPoints;
								total[task.Owner].Count += 1;
							}

							return total;
						}, {});

						var orderedData = _.map(Object.keys(result),
							function (key) {
								return { Owner: key, Points: result[key].Points, Count: result[key].Count }
							});

						// Order by Points, order by Count desc
						orderedData.sort(function (a, b) {
							if (a.Points > b.Points) {
								return -1;
							} else if (a.Points === b.Points) {
								return (b.Count - a.Count);
							} else { return 1; }
						});

						updateChart(workladStat, orderedData, "Owner", ["Points", "Count"], chartSeries);
					}

					workladStat.Collected = true;

					return true;
				};

				/**
				 * @name calcWorkingHours
				 * @description Summarize the working hours by owner and team
				 */
				$scope.calcWorkingHours = function () {
					$scope.InQuerying = true;
					$scope.clearError();

					// -- For chart display (owner)
					initChart($scope.workingHoursStatOwner/*, ["Hours", "Tasks Total"]*/);
					// -- For chart display (team)
					initChart($scope.workingHoursStatTeam/*, ["Hours", "Tasks Total"]*/);

					var token = adoAuthService.getAuthenticationToken();
					var parameters = { WorkItemType: "Task", Sprint: $scope.Dev.Sprint, Teams: ["Taiji", "Wudang", "Dunhuang"] };
					adoQueryService.calculateTaskSpentTime(parameters, token).then(function (result) {
						// For chart display (owner)
						var groupByOwner = utility.groupByMultiple(result, ["Owner"], ["OriginalEstimate", "CompletedWork"], true, false);
						groupByOwner = Object.keys(groupByOwner).map(function (owner) {
							var obj = groupByOwner[owner];
							return { Owner: owner, CompletedWork: obj.CompletedWork, Count: obj.__Count };
						}).sort(function (first, second) {
							return second.CompletedWork - first.CompletedWork;
						});

						updateChart($scope.workingHoursStatOwner, groupByOwner, "Owner", ["Count", "CompletedWork"]);

						// For chart display (team)
						var groupByTeam = utility.groupByMultiple(result, ["AreaPath"], ["OriginalEstimate", "CompletedWork"], true, false);
						groupByTeam = Object.keys(groupByTeam).map(function (team) {
							var obj = groupByTeam[team];
							return { Team: team.split(" ").pop(), CompletedWork: obj.CompletedWork, Count: obj.__Count };
						}).sort(function (first, second) {
							return second.CompletedWork - first.CompletedWork;
						});

						updateChart($scope.workingHoursStatTeam, groupByTeam, "Team", ["Count", "CompletedWork"]);
					},
						function (error) {
							reportError(error);
						})
						.then(function () {
							$scope.InQuerying = false;
							$scope.$apply();
						});
				};

				/**
				 * @name initChart (internal use)
				 * @param {any} chart	reference to the chart object
				 */
				function initChart(chart) {
					chart.ChartLabels = [];
					chart.ChartData = [];
					chart.Workload = [];

					if (!chart.ChartOptions) {
						chart.ChartOptions = {};
					}

					if (chart.ChartObject) {
						chart.ChartObject.destroy();
						chart.ChartObject = null;
					}
				}

				/**
				 * @name refreshChart (internal use)
				 * @param {any} chart	reference to the chart object
				 * @param {any} fullData	The data list
				 * @param {any} labelColumn	The array contains all label to be shown on chart
				 * @param {any} valueColumns	The array contains all value to be shown on chart
				 */
				function refreshChart1(chart, fullData, labelColumn, valueColumns) {
					var dataArrays = {};
					valueColumns.forEach(function (col) {
						dataArrays[col] = [];
					});

					fullData.forEach(function (data) {
						chart.ChartLabels.push(data[labelColumn]);
						valueColumns.forEach(function (col) {
							dataArrays[col].push(data[col]);
						});
					});

					chart.Workload = fullData;
					chart.ChartHeight = chart.ChartLabels.length * 10;
					valueColumns.forEach(function (col) {
						chart.ChartData.push(dataArrays[col]);
					});
				}

				/**
				 * The data structure for a Chart bar **************************************** /
				 */
				/*
				var data = {
					labels: ["January", "February", "March", "April", "May", "June", "July"],
					datasets: [
						{
							label: "My First dataset",
							fillColor: "rgba(220,220,220,0.5)",
							strokeColor: "rgba(220,220,220,0.8)",
							highlightFill: "rgba(220,220,220,0.75)",
							highlightStroke: "rgba(220,220,220,1)",
							data: [65, 59, 80, 81, 56, 55, 40]
						},
						{
							label: "My Second dataset",
							fillColor: "rgba(151,187,205,0.5)",
							strokeColor: "rgba(151,187,205,0.8)",
							highlightFill: "rgba(151,187,205,0.75)",
							highlightStroke: "rgba(151,187,205,1)",
							data: [28, 48, 40, 19, 86, 27, 90]
						}
					]
				};
				// The option structure
				var options = {
					//Boolean - Whether the scale should start at zero, or an order of magnitude down from the lowest value
					scaleBeginAtZero: true,

					//Boolean - Whether grid lines are shown across the chart
					scaleShowGridLines: true,

					//String - Colour of the grid lines
					scaleGridLineColor: "rgba(0,0,0,.05)",

					//Number - Width of the grid lines
					scaleGridLineWidth: 1,

					//Boolean - Whether to show horizontal lines (except X axis)
					scaleShowHorizontalLines: true,

					//Boolean - Whether to show vertical lines (except Y axis)
					scaleShowVerticalLines: true,

					//Boolean - If there is a stroke on each bar
					barShowStroke: true,

					//Number - Pixel width of the bar stroke
					barStrokeWidth: 2,

					//Number - Spacing between each of the X value sets
					barValueSpacing: 5,

					//Number - Spacing between data sets within X values
					barDatasetSpacing: 1,

					//String - A legend template
					legendTemplate: "<ul class=\"<%=name.toLowerCase()%>-legend\"><% for (var i=0; i<datasets.length; i++){%><li><span style=\"background-color:<%=datasets[i].fillColor%>\"></span><%if(datasets[i].label){%><%=datasets[i].label%><%}%></li><%}%></ul>"
				}
				*/	// *********************************************************************** /

				/**
				 * @name	updateSeriesConfigs
				 * @description	Applys the pre-configured series settings
				 * @param {any} configs	list of series setting. If passed in a string array, use the string as seris label
				 * @param {any} valueColumns	The name list of value column, use it as label if the [label] is not defined in SeriesConfig
				 */
				function updateSeriesConfigs(configs, valueColumns) {
					var backgroundColors = ["#5ec9db", "#dfc765", "#f27d51", "#6462cc", "#e6a0c4", "#c6cdf7", "#d8a499", "#7294d4", "#ffc900", "#595959", "#fe8c00", "#ff5338"];
					var updatedSeriesConfigs = []

					if (!configs || (Array.isArray(configs) && configs.length === 0)) {
						for (var valIndex in valueColumns) {
							updatedSeriesConfigs.push({
								label: valueColumns[valIndex]
								, backgroundColor: backgroundColors[valIndex]
							});
						}

						return updatedSeriesConfigs;
					}

					if (configs) {
						for (var seriesIndex in configs) {
							var config = configs[seriesIndex];
							if (typeof config  === "object") {
								if (!config.label) {
									config.label = (valueColumns && valueColumns[seriesIndex]) ? valueColumns[seriesIndex] : "";
								}

								if (!config.backgroundColor) {
									config.backgroundColor = backgroundColors[seriesIndex];
								}

								updatedSeriesConfigs.push(config);
							} else {
								updatedSeriesConfigs.push({
									label: config
									, backgroundColor: backgroundColors[seriesIndex]
								});
							}
						}
					}

					return updatedSeriesConfigs;
				}

				/**
				 * @name	updateChart
				 * @param {ChartObject} chart	The chart object
				 * @param {Array} fullData	Array contains all data
				 * @param {string} labelColumn	Gets value for this column and show as X axis label
				 * @param {string array} valueColumns	Gets value of those columns as Series data
				 * @param {object array} serieConfigs	List of Series Config
				 */
				function updateChart(chart, fullData, labelColumn, valueColumns, seriesConfigs) {
					var dataArrays = {};
					valueColumns.forEach(function (col) {
						dataArrays[col] = [];
					});

					fullData.forEach(function (data) {
						chart.ChartLabels.push(data[labelColumn]);
						valueColumns.forEach(function (col) {
							dataArrays[col].push(data[col]);
						});
					});

					seriesConfigs = updateSeriesConfigs(seriesConfigs, valueColumns);

					chart.Workload = fullData;
					for (var index in valueColumns) {
						var col = valueColumns[index];
						var config = seriesConfigs[index];
						config.data = dataArrays[col];

						chart.ChartData.push(config);
					}
					
					chart.ChartObject = new Chart(chart.ChartName, {
						type: "bar",
						data: {
							labels: chart.ChartLabels,
							datasets: chart.ChartData
						},
						options: _.extend(chart.ChartOptions, {
							title: {
								display: true,
								text: chart.ChartTitle + (chart.DateRange ? " ( <start> ~ <end>)".replace("<start>", chart.DateRange.Begin).replace("<end>", chart.DateRange.End) : "")
							},
							bars: {
								maxBarThicknet: 20
							}
							// TODO: change the size
							//chart.ChartHeight = chart.ChartLabels.length * 10
						})
					});
				}

				/**
				 * @name	Loads the sub tasks of a US or Bug
				 * @param {any} wit	A work item
				 * @param {any} token	The token string to be sent to ADO for the authentication
				 */
				function loadSubTaskState(wit, token) {
					var deferred = $.Deferred();

					if (!wit || !wit.Children || wit.Children.length === 0) {
						deferred.resolve([]);
						return deferred.promise();
					}

					var ids = _.pluck(wit.Children, "Id");
					adoQueryService.getTaskDetailInfo(adoRestApi.TemplateWitBatchQuery, ids, ["System.Id", "System.Title", "System.State", "System.AssignedTo", "Microsoft.VSTS.Scheduling.OriginalEstimate", "Microsoft.VSTS.Scheduling.CompletedWork"], token)
						.then(function (list) {
							list = _.flatten(_.pluck(list, "fields")).map(function (task) {
								return {
									Id: task["System.Id"],
									Owner: task["System.AssignedTo"] ? task["System.AssignedTo"].displayName : "",
									Title: task["System.Title"],
									State: task["System.State"],
									Estimate: task["Microsoft.VSTS.Scheduling.OriginalEstimate"],
									Completed: task["Microsoft.VSTS.Scheduling.CompletedWork"]
								};
							});

							wit.Children = list;

							deferred.resolve(wit.Children);
						})
						.catch(function (err) {
							deferred(err);
						});

					return deferred.promise();
				}

				/**
				 * @name	Generates the HTML table format message to be shown within Tooltip
				 * @param {Array} data	Data array
				 * @param {string or array} fieldsToSummary The list of field to be accumulated and show at footpage
				 */
				function generateHtmlFormatTableData(data, fieldsToSummary) {
					if (!data || !Array.isArray(data) || data.length === 0) return "";

					var html = "<table border=1><thead><tr><th><header-data></th></tr></thead><tbody><row-data></tbody><foot-data></table>";

					var footData = "";
					if (fieldsToSummary) {
						fieldsToSummary = [].concat(fieldsToSummary);
					} else {
						fieldsToSummary = [];
					}

					if (fieldsToSummary.length > 0) {
						footData = "<thead><tr><th><summary-data></th></tr></thead>";
					}

					var summaryData = {};
					var headers = [];
					for (var propName in data[0]) {
						headers.push(propName);
						summaryData[propName] = 0;
					}

					var tasks = 0;
					var rowsData = "";
					data.forEach(row => {
						tasks++;

						var tr = "<td>" + tasks + "</td>";
						headers.forEach(header => {
							var val = row[header] ? row[header] : "";
							tr = tr + "<td>" + val + "</td>";

							if ((val !== "") && !isNaN(val)) {
								if (fieldsToSummary.findIndex(field => { return field === header }) !== -1) {
									summaryData[header] += row[header];
								}
							}
						})

						rowsData = rowsData + "<tr>" + tr + "</tr>";
					});

					if (footData !== "") {
						var summary = [""];
						headers.forEach(header => {
							summary.push(((summaryData[header] !== 0) ? summaryData[header] : ""));
						})

						footData = footData.replace("<summary-data>", summary.join("</th><th>"));
					}

					headers = ["#"].concat(headers);
					html = html.replace("<header-data>", headers.join("</th><th>"))
								.replace("<row-data>", rowsData)
								.replace("<foot-data>", footData);

					return html;
				}

				/**
				 * @name	enableHtmlFormatTooltip()
				 * @description	Enables the HTML format Tooltip
				 */
				$scope.enableHtmlFormatTooltip = function () {
					setTimeout(function () {
						$('[data-html="true"]').tooltip({ sanitize: false });	// sanitize=falase for showing table in tooltip
					}, 100);
				};

				/**
				 * @name	export
				 * @description	Copy the current filtered data to clipboard
				 */
				$scope.export = function () {
					// TODO:
					var data = "ID\tTitle\tPriority\tStoryPoints\tOwner\tIteration\tState\t\CompletedDate";
					//var data = "ID\tTitle\tPriority\tProduct\tOwner\tIteration\tState\tReject\t" + $scope.Dev.OtherInfoLabel;
					_.each($scope.filteredRecords, function (record) {
						data += "\r\n" + record.Id + "\t" + record.Title + "\t" + record.Priority + "\t" + record.StoryPoints + "\t" + record.Owner + "\t" + record.Iteration + "\t" + record.State + "\t" + record.CompletedDate;
						//data += "\r\n" + record.id + "\t" + record.Title + "\t" + record.Priority + "\t" + record.Product + "\t" + record.Owner + "\t" + record.Iteration + "\t" + record.ScheduleState + "\t" + record.Reject + "\t" + record.Other;
					});

					window.alert(utility.copyToClipboard(data) ? "Data get copied to clipboard." : "Copy to clipboard failed.");
				};

				$scope.exportData = function (data, columns) {
					if (!data) return;

					var records = [];
					if (!columns) {
						columns = data.Columns;
						records = data.Workload;
					} else {
						records = data;
					}

					if (columns.length < 1 || records.length < 1) return;

					var header = "";
					columns.forEach(function(col) {
						header = header + col + "\t";
					});

					header = header.substr(0, header.length - 1);
					var rows = "";
					records.forEach(function(record) {
						var row = "";
						columns.forEach(function (col) {
							var value = utility.getRowData(record, col);
							row = row + (value ? value : "") + "\t";
						});

						// remove last tab
						row = row.substr(0, row.length - 1);

						rows = rows + row + "\r\n";
					});

					var exportTxt = header + "\r\n" + rows;
					window.alert(utility.copyToClipboard(exportTxt) ? "Data get copied to clipboard." : "Copy to clipboard failed.");
				};

				$scope.getFeatureName = function(featureId) {
					var featureName = featureId;

					if ($scope.FeatureList && $scope.FeatureList.length < 1) return featureName;

					var feature = $scope.FeatureList.find(function(f) {
						return f.Id === featureId;
					});

					if (feature) featureName = featureName + ": " + feature.Title;

					return featureName;
				};

				$scope.removeClass = function (elementName, className) {
					var element = $(elementName);
					if (element.length === 0) return;

					if (!element.attr('class')) return;

					element.attr('class', element.attr('class').replace(className, ''));
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
