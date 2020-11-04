'use strict';

define(['app', 'underscore', 'jquery'],
	function (app, _, $) {
		app.controller('rallyTaskController', [
			'$scope',
			'$rootScope',
			'$http',
			'$q',
			'rallyAuthService',
			'rallyQueryService',
			'rallyRestApi',
			'utility',
			'CurrentSettings',

			function ($scope, $rootScope, $http, $q, rallyAuthService, rallyQueryService, rallyRestApi, utility, CurrentSettings) {
				$scope.RALLY_INTERNAL_ERROR = 'RallyInternalError';
				$scope.SAVED_PARAMETERS = 'RallyTaskQueryParameters';
				$scope.SAVED_OTHERINFO = 'RallyTaskOtherInfo';
				$scope.TaskList = [];
				$scope.UserId = '';
				$scope.UserPwd = '';
				$scope.Owner = '';
				$scope.InQuerying = false;
				$scope.ErrorMsg = '';
				$scope.Sprint = 0;
				$scope.EmailList = Object.values(rallyRestApi.OwnerEmailMapping);
				$scope.OwnerNameList = Object.keys(rallyRestApi.OwnerEmailMapping);
				$scope.CanUseLocalStorage = rallyAuthService.CanUseLocalStorage;
				$scope.IfSaveOtherInfo2Local = true;
				$scope.OtherInfoLabel = 'Comments';
				$scope.LastFilteredCount = 0;
				$scope.LastRecordCount = 0;
				$scope.ShowUnassignedOnly = false;
				$scope.SDCOnly = false;
				$scope.CurrentTeamOnly = true;
				$scope.CurrentTeam = CurrentSettings.TeamShortName;
				$scope.DEOnly = false;
				$scope.ShowCurrentRelease = true;
				$scope.CurrentRelease = CurrentSettings.Release;
				$scope.ShowP2 = true;
				$scope.ShowOthers = false;
				$scope.ShowInDefine = true;
				$scope.ShowDefined = true;
				$scope.ShowWIP = true;
				$scope.ShowCompleted = true;
				$scope.ShowAccepted = true;
				$scope.ShowFailedOnly = false;
				$scope.ShowFakeTask = false;
				$scope.ShowRejectedDefects = true;
				$scope.QueryForOpenDefect = false;
				$scope.QueryTypeString = '';
				$scope.DeOrUs = 'ALL';

				$scope.ShowProductField = true;
				$scope.ShowIterationField = true;
				$scope.ShowRejectField = true;
				$scope.ShowEverFailedField = true;
				$scope.ShowBlockReasonField = true;


				$scope.OrderByOptions = [{ value: 0, name: 'Default' },
										{ value: 1, name: 'Priority' },
										{ value: 2, name: 'ScheduleState' }
										];
				$scope.OrderByValues = [['Owner', 'Iteration', '-ScheduleState', 'Rank', 'Priority'],
										['Priority', '-ScheduleState'],
										['-ScheduleState', 'Rank', 'Priority']
										];
				$scope.OrderByOptionIndex = 0;
				$scope.OrderByValue = $scope.OrderByValues[0];


				var crossroadsPhaseII = {
					Name: "Crossroads Phase II",
					Urls: [rallyRestApi.UrlOpenDefectCRP2],

					inScope: function (release) {
						return /\[Phase II]/i.test(release);
					},

					process: function (list) {
						// Remove the items that has no tag "1.7" or "CR Phase II"
						return list.filter(item => {
							if (!item.Tags || item.Count < 1 || !item.Tags._tagsNameArray) return false;
							var ret = false;
							_.forEach(item.Tags._tagsNameArray,
								function (tag) {
									if (/CR Phase II|1.7/i.test(tag.Name)) {
										ret = true;
										return;
									}
								});

							return ret;
						});
					}
				};

				var swiftwater = {
					Name: "Swiftwater",
					Urls: [rallyRestApi.UrlOpenDefectSwiftwater, rallyRestApi.UrlOpenUsSwiftwater],

					inScope: function (release) {
						return /\Swiftwater/i.test(release);
					},

					process: function (list) {
						return list;
					}
				};

				// #Configurable here#
				// Add new object if new added a release, refer to "crossradsPhaseII" or "swiftwater" about how to...
				var getCurrentProject = function () {
					if (CurrentRelease === 'SwiftWater') return swiftwater;
					if (CurrentRelease === 'Crossroads') return crossroadsPhaseII;

					return swiftwater;
				}
				// #Configurable end#

				// Re-enable the Tooltip since the filtered the tasks changed
				$scope.$watch('filteredRecords', function () {
					$scope.enableHtmlFormatTooltip();
				});

            	/**
				 * @name	saveCurrentParameters()
				 * @description	Saves the current parameters (owner, sprint, scope etc.) to browser local cache
				 */
				var saveCurrentParameters = function () {
					if (!$scope.CanUseLocalStorage) { return; }

					var data = {
						Owner: $scope.Owner,
						Sprint: $scope.Sprint,
						ShowP2: $scope.ShowP2,
						ShowCurrentRelease: $scope.ShowCurrentRelease,
						ShowOthers: $scope.ShowOthers,
						IfSaveOtherInfo2Local: $scope.IfSaveOtherInfo2Local,
						OtherInfoLabel: $scope.OtherInfoLabel,
						ShowProductField: $scope.ShowProductField,
						ShowIterationField: $scope.ShowIterationField,
						ShowRejectField: $scope.ShowRejectField,
						ShowEverFailedField: $scope.ShowEverFailedField,
						ShowBlockReasonField: $scope.ShowBlockReasonField
					};

					localStorage.setItem($scope.SAVED_PARAMETERS, JSON.stringify(data));
				}

            	/**
				 * @name	loadSavedParameters()
				 * @description	Loads saved parameters from browser local cache
				 */
				var loadSavedParameters = function () {
					if (!$scope.CanUseLocalStorage) { return; }

					var savedParameters = localStorage.getItem($scope.SAVED_PARAMETERS);
					if (!savedParameters) { return; }
					savedParameters = JSON.parse(savedParameters);

					if (savedParameters['Owner']) { $scope.Owner = savedParameters.Owner; }
					if (savedParameters['Sprint']) { $scope.Sprint = savedParameters.Sprint; }
					if (savedParameters['ShowP2']) { $scope.ShowP2 = savedParameters.ShowP2; }
					if (savedParameters['ShowCurrentRelease']) { $scope.ShowCurrentRelease = savedParameters.ShowCurrentRelease; }
					if (savedParameters['ShowOthers']) { $scope.ShowOthers = savedParameters.ShowOthers; }
					if (savedParameters['IfSaveOtherInfo2Local']) { $scope.IfSaveOtherInfo2Local = savedParameters.IfSaveOtherInfo2Local; }
					if (savedParameters['OtherInfoLabel']) { $scope.OtherInfoLabel = savedParameters.OtherInfoLabel; }
					if (savedParameters['ShowProductField']) { $scope.ShowProductField = savedParameters.ShowProductField; }
					if (savedParameters['ShowIterationField']) { $scope.ShowIterationField = savedParameters.ShowIterationField; }
					if (savedParameters['ShowRejectField']) { $scope.ShowRejectField = savedParameters.ShowRejectField; }
					if (savedParameters['ShowEverFailedField']) { $scope.ShowEverFailedField = savedParameters.ShowEverFailedField; }
					if (savedParameters['ShowBlockReasonField']) { $scope.ShowBlockReasonField = savedParameters.ShowBlockReasonField; }

					if ($scope.IfSaveOtherInfo2Local && $scope.TaskList.length > 0) {
						var otherInfo = localStorage.getItem($scope.SAVED_OTHERINFO);
						if (!otherInfo) { return; }
						otherInfo = JSON.parse(otherInfo);
						_.each(_.keys(otherInfo),
							function(key) {
								updateOtherInfo($scope.TaskList, key, otherInfo[key]);
							});
					}
				}

				loadSavedParameters();

				/**
				 * @name	Applys the comments according to id if it exist in list
				 * @param list	The task list
				 * @param id	The task ID
				 * @param value	The message to be updated
				 */
				var updateOtherInfo = function (list, id, value) {
					var index = _.findIndex(list, function (task) {
						if (!id || !task['id']) return false;

						return (id.substring(0, 6).toLowerCase() === task.id.substring(0, 6).toLowerCase());
					});

					if (index > -1) {
						list[index].Other = value;
					}
				};

				var initBeforeQuery = function () {
					// Record the last time record count so that we know if have changes between two query
					$scope.LastRecordCount = $scope.TaskList.length;
					$scope.LastFilteredCount = $scope.filteredRecords ? $scope.filteredRecords.length : 0;

					saveCurrentParameters();
					$scope.InQuerying = true;
					$scope.clearError();
					$scope.TaskList = [];
					$scope.resetWorkloadStat();
				};

				/**
				 * @name	saveOtherInfo2Local()
				 */
				$scope.saveOtherInfo2Local = function () {
					if (!$scope.IfSaveOtherInfo2Local) {
						return;
					}

					var otherInfo = {};
					_.each($scope.TaskList,
						function (task) {
							if (task['Other'] && task.Other !== '') {
								otherInfo[task.id] = task.Other;
							}
						});

					localStorage.setItem($scope.SAVED_OTHERINFO, JSON.stringify(otherInfo));
				};

				/**
				 * @name	refreshTaskList()
				 * @description	Get the task list of specified engineer from Rally, save to $scope.TaskList
				 */
				$scope.refreshTaskList = function () {
					initBeforeQuery();
					$scope.QueryForOpenDefect = false;
					$scope.QueryTypeString = ' --- ' + $scope.Owner + '\'s Rally task in sprint ' + $scope.Sprint + ' @' + new Date().toLocaleTimeString();
					$scope.refreshTaskByOwner({ 'Owner': $scope.Owner, 'Sprint': $scope.Sprint, 'ClearDataFirst': true }, $q)
						.then(function (result) {
							$scope.TaskList = result;

							// Load the other info from local storage
							loadSavedParameters();
						})
						.then(function () {
							setTimeout(function () { $scope.enableHtmlFormatTooltip(); }, 100);
						});
				};

            	/**
				 * @name	refreshAll()
				 * @description	Gets the task list of all engineers from Rally, save to $scope.TaskList
				 */
				$scope.refreshAll = function () {
					initBeforeQuery();
					$scope.QueryForOpenDefect = false;
					$scope.QueryTypeString = ' --- Rally task in sprint ' + $scope.Sprint + ' for ALL person @' + new Date().toLocaleTimeString();
					var promises = [];
					promises.push($scope.refreshTaskByOwner({ 'Owner': '', 'Sprint': $scope.Sprint, 'ClearDataFirst': false }, $q));

					$q.all(promises)
						.then(function (result) {
							result = _.filter(_.flatten(result),
								function (task) {
									return !(/^US/.test(task.id) && /\-(\s)?QA$/i.test(task.Title)); // Ignore the -QA user stories, not ignore for single query
								});
							$scope.TaskList = result;

							// Load the other info from local storage
							loadSavedParameters();
						})
						.catch(function (error) {
							reportError(error);
						})
						.finally(function () {
							$scope.enableHtmlFormatTooltip();
						});
				};

            	/**
				 * @name	getOpenDefects
				 * @descriptions	Gets all open defects of current project
				 */
				$scope.getOpenDefects = function () {
					initBeforeQuery();

					var token = rallyAuthService.getAuthenticationToken();
					var currentProject = getCurrentProject();

					$scope.QueryForOpenDefect = true;
					$scope.QueryTypeString = ' --- ALL ' + $scope.CurrentRelease + ' open tasks @' + new Date().toLocaleTimeString();
					var promises = [];
					currentProject.Urls.forEach(function (url) {
						promises.push(rallyQueryService.getFromRally(url, token));
					});

					$q.all(promises).then(function (list) {
						$scope.TaskList = currentProject.process(_.union(list[0], list[1]));

						// Load the other info from local storage
						loadSavedParameters();
					},
						function (error) {
							reportError(error);
						})
						.then(function () {
							$scope.InQuerying = false;
							//$scope.$apply();
							$scope.enableHtmlFormatTooltip();
						});
				}

            	/**
				 * @name	refreshTaskByOwner()
				 * @description	Get the Rally task according to the specified parameters. Called by refreshTaskList() and refreshAll()
				 * @param	parameters	Options for querying the tasks from Rally.
				 * @param	q		  	$q object.
				 * @param	taskList  	Append the list to the query result if it is not empty.
				 * @returns	Promise to the task for querying task from Rally
				 */
				$scope.refreshTaskByOwner = function (parameters, q, taskList) {
					var token = rallyAuthService.getAuthenticationToken();
					_.extend(parameters, { 'Token': token, 'Async': true });

					var deferred = $q.defer();
					var result = [];
					if (taskList && taskList.length > 0) {
						result.push(taskList);
					}

					q.all([
						rallyQueryService.getTasksFromRally(parameters, 'hierarchicalrequirement'),
						rallyQueryService.getTasksFromRally(parameters, 'defect')
					])
						.then(function (lists) {
							// If directly Complete the user story or defect under which still contains incompleted tasks
							// the SpentTime of those task would not be counted any more. So need to accumulate all task hours
							var tasks = _.union(lists[0], lists[1]);

							result = _.union(result, tasks);
							q.all(rallyQueryService.reCalculateTaskSpentTime(tasks, token))
								.then(function (updatedTasks) {
									// A user story or defect may contains some tasks assigned to different developer, need to filter out
									var otherOwnerTasks = _.flatten(_.filter(_.pluck(updatedTasks, "OtherOwnerTasks"), function (other) { return other !== undefined }));
									result = _.union(result, updatedTasks, otherOwnerTasks);

									deferred.resolve(result);
								})
								.catch(function (error) { reportError(error); })
								.finally(function () { $scope.InQuerying = false; });
						})
						.catch(function (error) {
							reportError(error);
							deferred.reject(error);
						});

					return deferred.promise;
				};

            	/**
				 * @name	scheduleStateFilter()
				 * @description	Schedule state filter
				 * @param	task	The task record to be filtered.
				 * @returns	false if do not want to show
				 */
				$scope.scheduleStateFilter = function (task) {
					if (!$scope.ShowFakeTask && task.FakeTask) return false;

					var isCurrentRelease = getCurrentProject().inScope(task.Release);
					var isP2 = crossroadsPhaseII.inScope(task.Release);
					var isOthers = !(isCurrentRelease || isP2);

					if (!$scope.ShowCurrentRelease && isCurrentRelease) return false;

					if (!$scope.ShowP2 && isP2) return false;

					if (!$scope.ShowOthers && isOthers) return false;

					if ($scope.QueryForOpenDefect && $scope.ShowUnassignedOnly && task.Owner !== '') return false;

					if ($scope.DeOrUs === 'DE Only' && task.id.indexOf("DE") === -1) return false;

					if ($scope.DeOrUs === 'US Only' && task.id.indexOf("US") === -1) return false;

					if ($scope.CurrentTeamOnly) {
						if (task.Project !== CurrentSettings.Team) return false;
					}

					if ($scope.SDCOnly) {
						if (!task.Owner || task.Owner === '') return false;
						var owner = task.Owner.toLowerCase();
						var find = $scope.OwnerNameList.find(function (data) {
							return owner === data.toLowerCase();
						});

						if (!find) return false;
					}

					if (!$scope.ShowRejectedDefects && (task.Reject || task.Postpone || task.Duplicate)) return false;

					if ($scope.ShowFailedOnly) {
						return task.EverFailed;
					}

					switch (task.ScheduleState) {
						case 'Completed':
							return $scope.ShowCompleted;
						case 'Accepted':
							return $scope.ShowAccepted;
						case 'In-Progress':
							return $scope.ShowWIP;
						case 'Defined':
							return $scope.ShowDefined;
						case 'In Definition':
							return $scope.ShowInDefine;
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
					var result = '';
					if (records && records.length > 0) {
						var totalDays = 0, actualHours = 0;
						_.each(records,
							function (record) {
								totalDays = totalDays + record.Estimate;
								actualHours = actualHours + (record.Actuals ? record.Actuals : 0);
							});

						result = '-- Est. Days:' + totalDays + ' | Act. Hours:' + Math.round(actualHours);
					}

					return result;
				}

				$scope.workloadStat = {};

            	/**
				 * @name	collectWorkloadStatData
				 * @description	Summarize the total estimation days, working hours and task count by engineer
				 * @returns	True if the workload stat data is generated successfully. False if no data.
				 */
				$scope.collectWorkloadStatData = function () {
					if (!$scope.filteredRecords) {
						$scope.workloadStat = {};
						return false;
					}

					if ($scope.workloadStat['Collected'] && $scope.workloadStat.Collected) {
						return true;
					};

					// -- For chart display
					$scope.workloadStat.ChartSeries = ['Est. Days', 'Tasks Total'];
					$scope.workloadStat.ChartOptions = [];

					$scope.workloadStat.ChartLabels = [];
					$scope.workloadStat.ChartData = [];
					var count = [];
					var days = [];
					// --------------- End

					if ($scope.filteredRecords.length > 0) {
						var result = $scope.filteredRecords.reduce(function (total, task) {
							var actuals = (task.Actuals) ? task.Actuals : 0;
							if (!(task.Owner in total)) {
								total[task.Owner] = { Days: task.Estimate, Hours: actuals, Count: 1 };
							} else {
								total[task.Owner].Days += task.Estimate;
								total[task.Owner].Hours += actuals;
								total[task.Owner].Count += 1;
							}

							return total;
						}, {});

						var orderedData = [];
						for (var owner in result) {
							var found = result[owner];
							orderedData.push({ Owner: owner, Count: found.Count, Days: found.Days, Hours: found.Hours });
						}

						// Order by Days and Count desc
						orderedData.sort(function (a, b) {
							if (a.Days > b.Days) {
								return -1;
							} else if (a.Days === b.Days) {
								return (a.Count - b.Count);
							} else { return 1; }
						});

						$scope.workloadStat.WorkLoad = orderedData;

						// For chart display
						//$scope.workloadStat.ChartLabels = Object.keys(result);
						_.each(orderedData, function (data) {
							$scope.workloadStat.ChartLabels.push(data.Owner);
							count.push(data.Count);
							days.push(data.Days);
						});

						$scope.workloadStat.ChartData.push(days);
						$scope.workloadStat.ChartData.push(count);
						$scope.workloadStat.ChartHeight = $scope.workloadStat.ChartLabels.length * 10;
					}

					$scope.workloadStat.Collected = true;

					return true;
				};

				$scope.resetWorkloadStat = function () {
					$scope.workloadStat = {};
				};

            	/**
				 * @name	checkStatPermission
				 * @description	Check stat permission
				 * @returns	If the current user has permission to see the data stat table/charter
				 */
				$scope.checkStatPermission = function () {
					if ($scope.QueryForOpenDefect) return false;

					if (document.getElementById('userId').value === 'dameng.zhang@carestream.com') {
						return true;
					} else {
						return false;
					}
				};

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
					var data = 'ID\tTitle\tPriority\tProduct\tOwner\tIteration\tState\tReject\t' + $scope.OtherInfoLabel;
					_.each($scope.filteredRecords, function (record) {
						data += '\r\n' + record.id + '\t' + record.Title + '\t' + record.Priority + '\t' + record.Product + '\t' + record.Owner + '\t' + record.Iteration + '\t' + record.ScheduleState + '\t' + record.Reject + '\t' + record.Other;
					});

					window.alert(utility.copyToClipboard(data) ? 'Data get copied to clipboard.' : 'Copy to clipboard failed.');
				};

            	/**
				 * @name	getProjectSummaryReport
				 * @description	Accumulate the total estimation days, actual working hours, task count group by project and ScheduleState
				 * @param	token	The authorization token for querying the Rally tasks.
				 * @returns	Summary report is saved to $scope.projectSummary.
				 */
				$scope.getProjectSummaryReport = function (token) {
					$scope.InQuerying = true;
					$scope.projectSummary = {};
					if (!token) {
						token = rallyAuthService.getAuthenticationToken();
					}

					summaryByProject($scope.Sprint, token)
						.then(function (result) {
							for (var project in result) {
								if (!result[project]['Not Start']) {
									result[project]['Not Start'] = { Estimate: 0, TimeSpent: 0, _Count: 0 };
								}

								if (!result[project]['In-Progress']) {
									result[project]['In-Progress'] = { Estimate: 0, TimeSpent: 0, _Count: 0 };
								}

								if (!result[project]['Completed']) {
									result[project]['Completed'] = { Estimate: 0, TimeSpent: 0, _Count: 0 };
								}

								if (!result[project]['Accepted']) {
									result[project]['Accepted'] = { Estimate: 0, TimeSpent: 0, _Count: 0 };
								}

								result[project].Total = (result[project]['Not Start']._Count + result[project]['In-Progress']._Count + result[project]['Completed']._Count + result[project]['Accepted']._Count) + ' ('
									+ (result[project]['Not Start'].Estimate + result[project]['In-Progress'].Estimate + result[project]['Completed'].Estimate + result[project]['Accepted'].Estimate)
									+ 'D)';
							}

							$scope.projectSummary = result;
						})
						.finally(function () { $scope.InQuerying = false; });;
				};

            	/**
				 * @name	summaryByProject
				 * @description	Gets the rally task summary group by Release/ScheduleState
				 * @param	sprint	The sprint.
				 * @param	token 	The authorization token for querying the Rally tasks.
				 * @returns	Promise to the summary result.
				 */
				var summaryByProject = function (sprint, token) {
					var stateFunc = function (record) {
						var state = 'Not Start';
						if (record.ScheduleState === 'In-Progress' || record.ScheduleState === 'Completed' || record.ScheduleState === 'Accepted') {
							state = record.ScheduleState;
						};

						return state;
					};

					var deferred = $q.defer();

					$q.all([
						rallyQueryService.getFromRally(rallyRestApi.getApiUrlTaskSummary(sprint, 'hierarchicalrequirement'), token),
						rallyQueryService.getFromRally(rallyRestApi.getApiUrlTaskSummary(sprint, 'defect'), token)
					])
						.then(function (lists) {
							var result = _.union(lists[0], lists[1]);

							result = utility.groupByMultiple(result, ['Release', stateFunc], ['Estimate', 'TimeSpent']);

							deferred.resolve(result);
						})
						.catch(function (error) {
							reportError(error);
							deferred.reject(error);
						});

					return deferred.promise;
				};

            	/**
				 * @name	getProjectSummaryReportPeriodically
				 * @description	After called this function, will gets project summary report periodically
				 * @returns	The project summary report periodically.
				 */
				$scope.getProjectSummaryReportPeriodically = function () {
					if (!$scope.Sprint || $scope.Sprint < 1) { return; }

					var token = "ZGFtZW5nLnpoYW5nQGNhcmVzdHJlYW0uY29tOjFxYXoyV1NY";

					$scope.getProjectSummaryReport(token);
					$scope.LastUpdate = "Last update at " + new Date().toLocaleTimeString();
					setTimeout($scope.getProjectSummaryReportPeriodically, 60000 * 10);
				};

				$scope.clearError = function() {
					$scope.ErrorMsg = '';
				};

            	/**
				 * @name	reportError
				 * @description	Reports an error
				 * @param	error	The error object.
				 */
				function reportError(error) {
					console.error(error.statusText);
					if (error.statusText === $scope.RALLY_INTERNAL_ERROR) {
						$scope.ErrorMsg = error.QueryResult.Errors.join(' || ');
					} else {
						$scope.ErrorMsg = error.statusText;
					}
				};
			}]);
	});
