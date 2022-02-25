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

			function ($scope, $rootScope, $http, $q, adoAuthService, adoQueryService, adoRestApi, utility, currentSettings, LocalStorageKey) {
				$scope.RALLY_INTERNAL_ERROR = "RallyInternalError";
				$scope.TaskList = [];
				$scope.FeatureList = [];
				$scope.UserId = "";
				$scope.UserPwd = "";
				$scope.Owner = "";
				$scope.InQuerying = false;
				$scope.ErrorMsg = "";
				$scope.Sprint = 0;
				$scope.EmailList = Object.values(currentSettings.OwnerEmailMapping);
				$scope.OwnerNameList = Object.keys(currentSettings.OwnerEmailMapping);
				$scope.CanUseLocalStorage = adoAuthService.CanUseLocalStorage;
				$scope.IfSaveOtherInfo2Local = true;
				$scope.OtherInfoLabel = "Comments";
				$scope.LastFilteredCount = 0;
				$scope.LastRecordCount = 0;
				$scope.ShowUnassignedOnly = false;
				$scope.SDCOnly = false;
				$scope.CurrentTeamOnly = true;
				$scope.CurrentTeam = currentSettings.Team;
				$scope.CurrentTeamShortName = currentSettings.TeamShortName;
				$scope.DEOnly = false;
				$scope.ShowCurrentRelease = true;
				$scope.CurrentRelease = currentSettings.Release;
				$scope.Show2ndRelease = true;
				$scope.SecondRelease = currentSettings.SecondRelease;
				$scope.ShowOthers = false;
				$scope.ShowNew = true;
				$scope.ShowAssigned = true;
				$scope.ShowWIP = true;
				$scope.ShowResolved = true;
				$scope.ShowClosed = true;
				$scope.ShowFailedOnly = false;
				$scope.ShowFakeTask = false;
				$scope.ShowRejectedDefects = true;
				$scope.QueryForOpenDefect = false;
				$scope.QueryTypeString = "";
				$scope.DeOrUs = "ALL";

				$scope.ShowProductField = true;
				$scope.ShowIterationField = true;
				$scope.ShowRejectField = true;
				$scope.ShowEverFailedField = true;
				$scope.ShowBlockReasonField = true;
				$scope.ShowInvalidItemOnly = false;

				$scope.OrderByOptions = [{ value: 0, name: "Default" },
										{ value: 1, name: "Priority" },
										{ value: 2, name: "State" }
										];
				$scope.OrderByValues = [["Owner", "Iteration", "-State", "Priority"],
										["Priority", "-State"],
										["-State", "Priority"]
										];
				$scope.OrderByOptionIndex = 0;
				$scope.OrderByValue = $scope.OrderByValues[0];
				$scope.ProjectTeamList = ["Taiji", "Wudang", "Penglai", "Dunhuang"];

				// Statistics data
				$scope.workloadStat = {
					Workload: [], ChartData: []
					, Headers: ["Name", "Count", "Story Points"]
					, Columns: ["Owner", "Count", "Points"]
				};

				$scope.workingHoursStatOwner = {
												Workload: [], ChartData: []
					, Headers: ["Name", "Completed Hours", "Task Count"]
					, Columns: ["Owner", "CompletedWork", "Count"]
				};

				$scope.workingHoursStatTeam = {
					Workload: [], ChartData: []
					, Headers: ["Team", "Completed Hours", "Task Count"]
					, Columns: ["Team", "CompletedWork", "Count"]
				};

				$scope.cpeCatalogStat = {
					Workload: [], ChartData: []
					, Headers: ["Catalog", "Count"]
					, Columns: ["catalog", "Count"]
				};
				// Statistics end

				// Re-enable the Tooltip since the filtered the tasks changed
				$scope.$watch("filteredRecords", function () {
					$scope.enableHtmlFormatTooltip();
				});

				loadSavedParameters();

				// Load feature list
				//adoQueryService.getFeatureList(adoAuthService.getAuthenticationToken())
				//				.then(function(list) {
				//						$scope.FeatureList = list;
				//					},
				//				function(e) {
				//					reportError(e);
				//				});

            	/**
				 * @name	saveCurrentParameters()
				 * @description	Saves the current parameters (owner, sprint, scope etc.) to browser local cache
				 */
				function saveCurrentParameters () {
					if (!$scope.CanUseLocalStorage) { return; }

					var data = {
						Owner: $scope.Owner,
						Sprint: $scope.Sprint,
						Show2ndRelease: $scope.Show2ndRelease,
						ShowCurrentRelease: $scope.ShowCurrentRelease,
						ShowOthers: $scope.ShowOthers,
						IfSaveOtherInfo2Local: $scope.IfSaveOtherInfo2Local,
						OtherInfoLabel: $scope.OtherInfoLabel,
						ShowProductField: $scope.ShowProductField,
						ShowIterationField: $scope.ShowIterationField,
						ShowRejectField: $scope.ShowRejectField,
						ShowBlockReasonField: $scope.ShowBlockReasonField
					};

					localStorage.setItem(LocalStorageKey.SAVED_PARAMETERS, JSON.stringify(data));
				}

            	/**
				 * @name	loadSavedParameters()
				 * @description	Loads saved parameters from browser local cache
				 */
				function loadSavedParameters () {
					if (!$scope.CanUseLocalStorage) { return; }

					var savedParameters = localStorage.getItem(LocalStorageKey.SAVED_PARAMETERS);
					if (!savedParameters || savedParameters.trim() === "") { return; }
					try {
						savedParameters = JSON.parse(savedParameters);

						if (savedParameters["Owner"] != undefined) { $scope.Owner = savedParameters.Owner; }
						if (savedParameters["Sprint"] != undefined) { $scope.Sprint = savedParameters.Sprint; }
						if (savedParameters["Show2ndRelease"] != undefined) { $scope.Show2ndRelease = savedParameters.Show2ndRelease; }
						if (savedParameters["ShowCurrentRelease"] != undefined) { $scope.ShowCurrentRelease = savedParameters.ShowCurrentRelease; }
						if (savedParameters["ShowOthers"] != undefined) { $scope.ShowOthers = savedParameters.ShowOthers; }
						if (savedParameters["IfSaveOtherInfo2Local"] != undefined) { $scope.IfSaveOtherInfo2Local = savedParameters.IfSaveOtherInfo2Local; }
						if (savedParameters["OtherInfoLabel"] != undefined) { $scope.OtherInfoLabel = savedParameters.OtherInfoLabel; }
						if (savedParameters["ShowProductField"] != undefined) { $scope.ShowProductField = savedParameters.ShowProductField; }
						if (savedParameters["ShowIterationField"] != undefined) { $scope.ShowIterationField = savedParameters.ShowIterationField; }
						if (savedParameters["ShowRejectField"] != undefined) { $scope.ShowRejectField = savedParameters.ShowRejectField; }
						if (savedParameters["ShowBlockReasonField"] != undefined) { $scope.ShowBlockReasonField = savedParameters.ShowBlockReasonField; }

						if ($scope.IfSaveOtherInfo2Local && $scope.TaskList.length > 0) {
							var otherInfo = localStorage.getItem(LocalStorageKey.SAVED_OTHERINFO);
							if (!otherInfo) {
								return;
							}
							otherInfo = JSON.parse(otherInfo);
							_.each(_.keys(otherInfo),
								function(key) {
									updateOtherInfo($scope.TaskList, key, otherInfo[key]);
								});
						}
					} catch (err) {
						reportError(err);
					}
				}

				/**
				 * @name	updateOtherInfo
				 * @description Apply the comments according to id if it exist in list
				 * @param list	The task list
				 * @param id	The task ID
				 * @param value	The message to be updated
				 */
				function updateOtherInfo (list, id, value) {
					var index = _.findIndex(list, function (task) {
						if (!id || !task["id"]) return false;

						return (id.substring(0, 6).toLowerCase() === task.id.substring(0, 6).toLowerCase());
					});

					if (index > -1) {
						list[index].Other = value;
					}
				};

				function initBeforeQuery () {
					// Record the last time record count so that we know if have changes between two query
					$scope.LastRecordCount = $scope.TaskList.length;
					$scope.LastFilteredCount = $scope.filteredRecords ? $scope.filteredRecords.length : 0;

					saveCurrentParameters();
					$scope.InQuerying = true;
					$scope.clearError();
					$scope.TaskList = [];

					initChart($scope.workloadStat, ["Points", "Tasks Total"]);
				};
				
				/**
				 * @name	saveOtherInfo2Local()
				 * @description Saves the comments recorded in "Other" field to the local storage
				 */
				$scope.saveOtherInfo2Local = function () {
					if (!$scope.IfSaveOtherInfo2Local) {
						return;
					}

					var otherInfo = {};
					_.each($scope.TaskList,
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
					input.onchange = function(e) {
						var file = e.target.files[0];
						var reader = new FileReader();
						reader.onload = function(e) {
							var content = e.target.result;
							var otherInfo = JSON.parse(content);

							_.each(_.keys(otherInfo),
								function(key) {
									updateOtherInfo($scope.TaskList, key, otherInfo[key]);
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
				$scope.clearCache = function() {
					if (confirm("This will clear all ADO related cache from this machine, are you sure?")) {
						localStorage.removeItem(LocalStorageKey.LOCAL_STORAGE_KEY);
						localStorage.removeItem(LocalStorageKey.SAVED_PARAMETERS);
						localStorage.removeItem(LocalStorageKey.SAVED_OTHERINFO);
					}
				}

				/**
				 * Saves the project team settings to local storage
				 */
				$scope.saveCurrentProjectTeamToLocalStorage = function ()
				{
					var data = {
						Team: $scope.CurrentTeam,
						TeamShortName: $scope.CurrentTeamShortName
					}

					currentSettings.saveSettingsToLocalStorage(data);
				}

				/**
				 * Gets called when user changed the current project team
				 * @param {any} team
				 */
				$scope.projectTeamChanged = function(team) {
					var shortName = team;
					$scope.CurrentTeamShortName = shortName;
				}

				/**
				 * @name	refreshTaskList()
				 * @description	Get the task list of specified engineer from ADO, save to $scope.TaskList
				 */
				$scope.refreshTaskList = function () {
					$scope.QueryTypeString = " --- " + $scope.Owner + "'s ADO task in sprint " + $scope.Sprint + " @" + new Date().toLocaleTimeString();

					var parameters = { Owners: $scope.Owner, Sprint: $scope.Sprint, Teams: $scope.CurrentTeam };
					getAdoTask(parameters);
				};

            	/**
				 * @name	refreshAll()
				 * @description	Gets the task list of all engineers from ADO, save to $scope.TaskList
				 */
				$scope.refreshAll = function () {
					$scope.QueryTypeString = " --- ADO task in sprint " + $scope.Sprint + " for ALL person @" + new Date().toLocaleTimeString();

					var parameters = { Owners: "", Sprint: $scope.Sprint, Teams: $scope.CurrentTeam };
					getAdoTask(parameters);
				};

            	/**
				 * @name	getOpenDefects
				 * @descriptions	Gets all open defects of current project
            	 * @param release	The release name
				 */
				$scope.getOpenDefects = function (release) {
					var project = adoRestApi.getRelease(release);
					if (!project) {
						reportError("Please specify the release for querying open defect");
						return;
					}

					initBeforeQuery();

					var token = adoAuthService.getAuthenticationToken();

					$scope.QueryForOpenDefect = true;
					$scope.QueryTypeString = " --- ALL " + project.Name + " open tasks @" + new Date().toLocaleTimeString();
					
					var parameters = { Token: token, States: ["Submitted", "New", "Assigned", "Active"] };
					_.extend(parameters, project.Parameters)
					adoQueryService.getAdoTaskUsingWiql(parameters).then(function (list) {
						$scope.TaskList = project.process(list);

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
				}
				
            	/**
				 * @name	getAdoTask()
				 * @description	Get the ADO task according to the specified parameters. Called by refreshTaskList() and refreshAll(). Call by others internally
				 * @param	parameters	Options for querying the tasks from ADO.				 
				 */
				function getAdoTask(parameters) {
					initBeforeQuery();
					$scope.QueryForOpenDefect = false;
					
					var token = adoAuthService.getAuthenticationToken();
					_.extend(parameters, { Token: token });
					adoQueryService.getAdoTaskUsingWiql(parameters)
						.then(function (result) {
							$scope.TaskList = result;

							// Load the other info from local storage
							loadSavedParameters();
						}, function(error) {
							console.error("refreshTaskList() failed");
						})
						.then(function () {
							$scope.InQuerying = false;
							$scope.enableHtmlFormatTooltip();
							$scope.$apply();
						});
				};

				/**
				 * @name getCpeStatistics
				 * @description Gets the CPE statistics by owner and team
				 */
				$scope.getCpeStatistics = function() {
					initChart($scope.cpeCatalogStat, ["Catalog", "Count"]);
					$scope.cpeCatalogStat.CatalogData = [];

					var token = adoAuthService.getAuthenticationToken();
					adoQueryService.getCpeStatistics({ Token: token })
						.then(function(result) {
								var catalogStat = utility.groupByMultiple(result, [function(ceil) {
									return ceil.CPEInfo.catalog;
								}], []);
								
								catalogStat = Object.keys(catalogStat)
													.map(function(catalog) {
														return { catalog: catalog, Count: catalogStat[catalog]._Count };
													})
									.sort(function (first, second) {
										if (second.Count !== first.Count) {
											return second.Count - first.Count;
										} else {
											return first.catalog.localeCompare(second.catalog);
										}
									});
								$scope.cpeCatalogStat.CatalogData = catalogStat;
								refreshChart($scope.cpeCatalogStat, catalogStat, "catalog", ["Count"]);
							},
							function(error) {
								reportError(error);
							})
						.then(function() {
							$scope.$apply();
						});
				}

            	/**
				 * @name	scheduleStateFilter()
				 * @description	Schedule state filter
				 * @param	task	The task record to be filtered.
				 * @returns	false if do not want to show
				 */
				$scope.scheduleStateFilter = function (task) {
					if (!$scope.QueryForOpenDefect) {
						if (!$scope.ShowFakeTask && task.FakeTask) return false;

						var isCurrentRelease = adoRestApi.getCurrentRelease().inScope(task.CSH_Release);
						var is2ndRelease = adoRestApi.getSecondRelease().inScope(task.CSH_Release);
						var isOthers = !(isCurrentRelease || is2ndRelease);

						if (!$scope.ShowCurrentRelease && isCurrentRelease) return false;

						if (!$scope.Show2ndRelease && is2ndRelease) return false;

						if (!$scope.ShowOthers && isOthers) return false;
					}

					if ($scope.QueryForOpenDefect && $scope.ShowUnassignedOnly && task.Owner !== "") return false;

					var isBug = (task.WorkItemType === "Bug");

					if (!isBug && $scope.DeOrUs === "DE Only") return false;

					if (isBug && $scope.DeOrUs === "US Only") return false;

					if ($scope.CurrentTeamOnly) {
						if (task.AreaPath & task.AreaPath.indexOf(currentSettings.Team) < 0) return false;
					}

					if ($scope.SDCOnly) {
						if (!task.Owner || task.Owner === "") return false;
						var owner = task.Owner.toLowerCase();
						var find = $scope.OwnerNameList.find(function (data) {
							return owner === data.toLowerCase();
						});

						if (!find) return false;
					}

					if ($scope.ShowInvalidItemOnly) {
						return (task.AcMissed
								|| task.RequiredFieldMissed
								|| task.WrongOwner
								|| task.WorkingHoursMissed);
					}

					if (!$scope.ShowRejectedDefects && (task.Reject || task.Postpone || task.Duplicate)) return false;

					if ($scope.ShowFailedOnly) {
						return task.EverFailed;
					}

					switch (task.State) {
						case "Resolved":
							return $scope.ShowResolved;
						case "Closed":
						case "Verified":
							return $scope.ShowClosed;
						case "Active":
							return $scope.ShowWIP;
						case "Assigned":
							return $scope.ShowAssigned;
						case "New":
						case "Submitted":
							return $scope.ShowNew;
					}

					return false;
				};

            	/**
				 * @name	getWorkload
				 * @description	Accumulate the total estimation days and actual working hours 
				 * @param	records	The records to accumulate.
				 * @returns	The accumulate result string.
				 */
				$scope.getWorkload = function (records) {
					// TODO:
					var result = "";
					if (records && records.length > 0) {
						var totalDays = 0, actualHours = 0;
						_.each(records,
							function (record) {
								totalDays = totalDays + record.Estimate;
								actualHours = actualHours + (record.Actuals ? record.Actuals : 0);
							});

						result = "-- Est. Days:" + totalDays + " | Act. Hours:" + Math.round(actualHours);
					}

					return result;
				}

				/**
				 * @name	collectWorkloadStatData
				 * @description	Summarize the total estimation days, working hours and task count by engineer
				 * @returns	True if the workload stat data is generated successfully. False if no data.
				 */
				$scope.collectWorkloadStatData = function () {
					if (!$scope.filteredRecords) {
						initChart($scope.workloadStat);
						return false;
					}

					if ($scope.workloadStat["Collected"] && $scope.workloadStat.Collected) {
						return true;
					};

					if ($scope.filteredRecords.length > 0) {
						var result = $scope.filteredRecords.reduce(function (total, task) {
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
							function(key) {
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

						refreshChart($scope.workloadStat, orderedData, "Owner", ["Points", "Count"]);
					}

					$scope.workloadStat.Collected = true;

					return true;
				};

				/**
				 * @name calcWorkingHours
				 * @description Summarize the working hours by owner and team
				 */
				$scope.calcWorkingHours = function() {
					// -- For chart display (owner)
					initChart($scope.workingHoursStatOwner, ["Hours", "Tasks Total"]);
					// -- For chart display (team)
					initChart($scope.workingHoursStatTeam, ["Hours", "Tasks Total"]);

					var token = adoAuthService.getAuthenticationToken();
					var parameters = { WorkItemType:"Task", Sprint: $scope.Sprint, Teams: ["Taiji","Wudang", "Dunhuang"] };
					adoQueryService.calculateTaskSpentTime(parameters, token).then(function(result) {
							// For chart display (owner)
							var groupByOwner = utility.groupByMultiple(result, ["Owner"], ["OriginalEstimate", "CompletedWork"]);
							groupByOwner = Object.keys(groupByOwner).map(function(owner) {
								var obj = groupByOwner[owner];
								return { Owner: owner, CompletedWork: obj.CompletedWork, Count: obj._Count };
							}).sort(function(first, second) {
								return second.CompletedWork - first.CompletedWork;
							});

							refreshChart($scope.workingHoursStatOwner, groupByOwner, "Owner", ["Count", "CompletedWork"]);
						
							// For chart display (team)
							var groupByTeam = utility.groupByMultiple(result, ["AreaPath"], ["OriginalEstimate", "CompletedWork"]);
							groupByTeam = Object.keys(groupByTeam).map(function(team) {
								var obj = groupByTeam[team];
								return { Team: team.split(" ").pop(), CompletedWork: obj.CompletedWork, Count: obj._Count };
							}).sort(function(first, second) {
								return second.CompletedWork - first.CompletedWork;
							});

							refreshChart($scope.workingHoursStatTeam, groupByTeam, "Team", ["Count", "CompletedWork"]);
						},
						function(error) {
							reportError(error);
						})
						.then(function() {
							$scope.$apply();
						});
				}

				/**
				 * @name initChart (internal use)
				 * @param {any} chart	reference to the chart object
				 * @param {any} series	reference to the chart's Series object
				 */
				function initChart(chart, series) {
					chart.ChartSeries = series;
					chart.ChartOptions = [];
					chart.ChartLabels = [];
					chart.ChartData = [];
				}

				/**
				 * @name refreshChart (internal use)
				 * @param {any} chart	reference to the chart object
				 * @param {any} fullData	The data list
				 * @param {any} labelColumn	The array contains all label to be shown on chart
				 * @param {any} valueColumns	The array contains all value to be shown on chart
				 */
				function refreshChart(chart, fullData, labelColumn, valueColumns) {
					var dataArrays = {};
					valueColumns.forEach(function(col) {
						dataArrays[col] = [];
					});

					fullData.forEach(function(data) {
						chart.ChartLabels.push(data[labelColumn]);
						valueColumns.forEach(function(col) {
							dataArrays[col].push(data[col]);
						});
					});

					chart.Workload = fullData;
					chart.ChartHeight = chart.ChartLabels.length * 10;
					valueColumns.forEach(function(col) {
						chart.ChartData.push(dataArrays[col]);
					});
				}

				$scope.orderChanged = function () {
					$scope.OrderByValue = $scope.OrderByValues[$scope.OrderByOptionIndex];
				};

				/**
				 * @name	enableHtmlFormatTooltip()
				 * @description	Enables the HTML format Tooltip
				 */
				$scope.enableHtmlFormatTooltip = function () {
					setTimeout(function () {
						$('[data-html="true"]').tooltip();
					}, 100);
				};

            	/**
				 * @name	export
				 * @description	Copy the current filtered data to clipboard
				 */
				$scope.export = function () {
					// TODO:
					var data = "ID\tTitle\tEstimation\tWorkingHours\tOwner\tIteration\tState";
					//var data = "ID\tTitle\tPriority\tProduct\tOwner\tIteration\tState\tReject\t" + $scope.OtherInfoLabel;
					_.each($scope.filteredRecords, function (record) {
						data += "\r\n" + record.id + "\t" + record.Title + "\t" + record.Estimate + "\t" + record.Actuals + "\t" + record.Owner + "\t" + record.Iteration + "\t" + record.ScheduleState;
						//data += "\r\n" + record.id + "\t" + record.Title + "\t" + record.Priority + "\t" + record.Product + "\t" + record.Owner + "\t" + record.Iteration + "\t" + record.ScheduleState + "\t" + record.Reject + "\t" + record.Other;
					});

					window.alert(utility.copyToClipboard(data) ? "Data get copied to clipboard." : "Copy to clipboard failed.");
				};

				$scope.exportData = function(data) {
					if (!data 
						|| !data.Workload || data.Workload.length < 1 
						|| !data.Columns || data.Columns.length < 1) return;

					var header = "";
					data.Columns.forEach(function(col) {
						header = header + col + "\t";
					});

					header = header.substr(0, header.length - 1);
					var rows = "";
					data.Workload.forEach(function(record) {
						var row = "";
						data.Columns.forEach(function(col) {
							row = row + (record[col] ? record[col] : "") + "\t";
						});

						// remove last tab
						row = row.substr(0, row.length - 1);

						rows = rows + row + "\r\n";
					});

					var exportTxt = header + "\r\n" + rows;
					window.alert(utility.copyToClipboard(exportTxt) ? "Data get copied to clipboard." : "Copy to clipboard failed.");
				};

            	/**
				 * @name	summaryByProject
				 * @description	Gets the rally task summary group by Release/ScheduleState
				 * @param	sprint	The sprint.
				 * @param	token 	The authorization token for querying the ADO tasks.
				 * @returns	Promise to the summary result.
				 */
				function summaryByProject (sprint, token) {
					var stateFunc = function (record) {
						var state = "Not Start";
						if (record.ScheduleState === "In-Progress" || record.ScheduleState === "Completed" || record.ScheduleState === "Accepted") {
							state = record.ScheduleState;
						};

						return state;
					};

					var deferred = $q.defer();

					$q.all([
						adoQueryService.getFromRally(adoRestApi.getApiUrlTaskSummary(sprint, "hierarchicalrequirement"), token),
						adoQueryService.getFromRally(adoRestApi.getApiUrlTaskSummary(sprint, "defect"), token)
					])
						.then(function (lists) {
							var result = _.union(lists[0], lists[1]);

							result = utility.groupByMultiple(result, ["Release", stateFunc], ["Estimate", "TimeSpent"]);

							deferred.resolve(result);
						})
						.catch(function (error) {
							reportError(error);
							deferred.reject(error);
						});

					return deferred.promise;
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
							if (error.statusText === $scope.RALLY_INTERNAL_ERROR) {
								errorMsg = error.QueryResult.Errors.join(" || ");
							} else {
								errorMsg = error.statusText;;
							}
						} else {
							errorMsg = error.toString();
						}
					}

					console.error(errorMsg);
					$scope.ErrorMsg = errorMsg;
				};
			}]);
	});
