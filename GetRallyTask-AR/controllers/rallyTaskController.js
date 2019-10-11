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

			function ($scope, $rootScope, $http, $q, rallyAuthService, rallyQueryService, rallyRestApi, utility) {
				$scope.RALLY_INTERNAL_ERROR = 'RallyInternalError';
				$scope.SAVED_PARAMETERS = 'RallyTaskQueryParameters';
				$scope.TaskList = [];
				$scope.UserId = '';
				$scope.UserPwd = '';
				$scope.owner = '';
				$scope.inQuerying = false;
				$scope.ErrorMsg = '';
				$scope.sprint = 0;
				$scope.IgnoreScheduleState = false;
				$scope.emailList = Object.values(rallyRestApi.OwnerEmailMapping);
				$scope.OwnerNameList = Object.keys(rallyRestApi.OwnerEmailMapping);
				$scope.CanUseLocalStorage = rallyAuthService.CanUseLocalStorage;
				$scope.SDCOnly = true;
				$scope.Show13a = false;
				$scope.Show13b = false;
				$scope.Show14a = true;
				$scope.Show14b = true;
				$scope.ShowOthers = false;
				$scope.ShowInDefine = true;
				$scope.ShowDefined = true;
				$scope.ShowWIP = true;
				$scope.ShowCompleted = true;
				$scope.ShowAccepted = true;
				$scope.ShowFailedOnly = false;
				
				$scope.OrderByOptions = [{ value: 0, name: 'Default' },
										 { value: 1, name: 'Priority' },
										 { value: 2, name: 'ScheduleState' }
				];
				$scope.OrderByValues = [['Owner', 'Iteration', '-ScheduleState', 'Rank', 'Priority'],
										 ['Priority', '-ScheduleState'],
										 ['-ScheduleState', 'Rank', 'Priority']];
				$scope.OrderByOptionIndex = 0;
				$scope.OrderByValue = $scope.OrderByValues[0];

				loadSavedParameters();

				/**
				 * @name	saveCurrentParameters()
				 *
				 * @description	Saves the current parameters (owner, sprint, scope etc.) to browser local cache
				 *
				 */
				function saveCurrentParameters() {
					if (!$scope.CanUseLocalStorage) { return; }

					localStorage.setItem($scope.SAVED_PARAMETERS, $scope.owner + ':' + $scope.sprint + ':' + $scope.Show13a + ':' + $scope.Show13b + ':' + $scope.Show14a + ':' + $scope.Show14b + ':' + $scope.ShowOthers);
				}

				/**
				 * @name	loadSavedParameters()
				 *
				 * @description	Loads saved parameters from browser local cache
				 *
				 */
				function loadSavedParameters() {
					if (!$scope.CanUseLocalStorage) { return; }

					var savedParameters = localStorage.getItem($scope.SAVED_PARAMETERS);
					if (!savedParameters) { return; }

					var parameters = savedParameters.split(':');
					if (parameters.length > 0) { $scope.owner = parameters[0]; }
					if (parameters.length > 1) { $scope.sprint = parseInt(parameters[1]); }
					if (parameters.length > 2) { $scope.Show13a = parameters[2] == 'true'; }
					if (parameters.length > 3) { $scope.Show13b = parameters[3] == 'true'; }
					if (parameters.length > 4) { $scope.Show14a = parameters[4] == 'true'; }
					if (parameters.length > 5) { $scope.Show14b = parameters[5] == 'true'; }
					if (parameters.length > 6) { $scope.ShowOthers = parameters[6] == 'true'; }
				}

				$scope.clearError = function () {
					$scope.ErrorMsg = '';
				}

				/**
				 * @name	$scope.refreshTaskList = function ()
				 *
				 * @description	Get the task list of specified engineer from Rally, save to $scope.TaskList
				 *
				 */
				$scope.refreshTaskList = function () {
					$scope.inQuerying = true;
					$scope.clearError();
					$scope.TaskList = [];
					$scope.resetWorkloadStat();
					saveCurrentParameters();
					$scope.refreshTaskByOwner({ 'Owner': $scope.owner, 'Sprint': $scope.sprint, 'IgnoreScheduleState': $scope.IgnoreScheduleState, 'ClearDataFirst': true }, $q)
						.then(function (result) {
							$scope.TaskList = result;
						})
						.finally(function () { $scope.inQuerying = false; });
				};

				/**
				 * @name	refreshAll
				 *
				 * @description	Get the task list of all engineers from Rally, save to $scope.TaskList
				 * 
				 */
				$scope.refreshAll = function () {
					$scope.inQuerying = true;
					$scope.clearError();
					$scope.TaskList = [];
					$scope.resetWorkloadStat();
					saveCurrentParameters();

					var promises = [];
					//_.each($scope.emailList, function (email) {
					//	promises.push($scope.refreshTaskByOwner({ 'Owner': email, 'Sprint': $scope.sprint, 'IgnoreScheduleState': $scope.IgnoreScheduleState, 'ClearDataFirst': false }, $q));
					//})
					promises.push($scope.refreshTaskByOwner({ 'Owner': '', 'Sprint': $scope.sprint, 'IgnoreScheduleState': $scope.IgnoreScheduleState, 'ClearDataFirst': false }, $q));

					$q.all(promises)
					.then(function (result) {
						result = _.flatten(result);
						$scope.TaskList = result;
					})
					.catch(function (error) {
						reportError(error);
					})
					.finally(function () { $scope.inQuerying = false; });
				};

				/**
				 * @name	refreshTaskByOwner
				 *
				 * @description	Get the Rally task according to the specified parameters. Called by refreshTaskList() and refreshAll()
				 *
				 * @param	parameters	Options for querying the tasks from Rally.
				 * @param	q		  	$q object.
				 * @param	taskList  	Append the list to the query result if it is not empty.
				 *
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
							// the SpentTime of those taks would not be counted any more. So need to accumulate all task hours
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
								.finally(function () { $scope.inQuerying = false; });
						})
						.catch(function (error) {
							reportError(error)
							deferred.reject(error);
						});

					return deferred.promise;
				};

				/**
				 * @name	scheduleStateFilter
				 *
				 * @description	Schedule state filter
				 *
				 * @param	task	The task record to be filtered.
				 *
				 * @returns	false if do not want to show
				 */
				$scope.scheduleStateFilter = function (task) {
					var is3A = /1.3a/i.test(task.Release);
					var is3B = /1.3b/i.test(task.Release);
					var is4A = /1.4a/i.test(task.Release);
					var is4B = /1.4b/i.test(task.Release);
					var isOthers = !(is3A || is3B || is4A || is4B);

					if (!$scope.Show13a && is3A) return false;

					if (!$scope.Show13b && is3B) return false;

					if (!$scope.Show14a && is4A) return false;

					if (!$scope.Show14b && is4B) return false;

					if (!$scope.ShowOthers && isOthers) return false;

					if ($scope.SDCOnly) {
						if (!task.Owner || task.Owner == '') return false;
						var ower = task.Owner.toLowerCase();
						var find = $scope.OwnerNameList.find(function (data) {
							return ower == data.toLowerCase();
						});

						if (!find) return false;
					}

					if ($scope.ShowFailedOnly) {
						return task.EverFailed;
					}

					if (!$scope.IgnoreScheduleState) return true;

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
				}

				/**
				 * @name	getWorkload
				 *
				 * @description	Accumulate the total estimation days and acutal working hours 
				 *
				 * @param	records	The records to accumlate.
				 *
				 * @returns	The accumlate result string.
				 */
				$scope.getWorkload = function (records) {
					var result = '';
					if (records && records.length > 0) {
						var totalDays = 0, actualHours = 0;
						_.each(records, function (record) {
							totalDays = totalDays + record.Estimate;
							actualHours = actualHours + (record.Actuals ? record.Actuals : 0);
						})

						result = '-- Est. Days:' + totalDays + ' | Act. Hours:' + Math.round(actualHours);
					}

					return result;
				}

				$scope.workloadStat = {};

				/**
				 * @name	collectWorkloadStatData
				 *
				 * @description	Summarize the totoal estimation days, working hours and task count by engineer
				 *
				 * @returns	Ture if the workload stat data is generated successfully. False if no data.
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
							} else if (a.Days == b.Days) {
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
				}

				/**
				 * @name	checkStatPermision
				 *
				 * @description	Check stat permision
				 *
				 * @returns	If the current user has permission to see the data stat table/charter
				 */
				$scope.checkStatPermision = function () {
					if (document.getElementById('userId').value === 'dameng.zhang@carestream.com') {
						return true;
					} else {
						return false;
					}
				};

				$scope.orderChanged = function () {
					$scope.OrderByValue = $scope.OrderByValues[$scope.OrderByOptionIndex];
				}

				/**
				 * @name	export
				 *
				 * @description	Copy the current filtered data to clipboard
				 *
				 */
				$scope.export = function () {
					var data = 'ID\tDescription\tPriority\tOwner\tIteration\tState\tReject';
					_.each($scope.filteredRecords, function (record) {
						data += '\r\n' + record.id + '\t' + record.Description + '\t' + record.Priority+ '\t' + record.Owner + '\t' + record.Iteration + '\t' + record.ScheduleState + '\t' + record.Reject;
					});

					window.alert(utility.copyToClipboard(data) ? 'Data get copied to clipboard.' : 'Copy to clipboard failed.');
				}

				/**
				 * @name	getProjectSummaryReport
				 *
				 * @description	Accumulate the total estimation days, actual working hours, task count group by project and ScheduleState
				 *
				 * @param	token	The authorization token for querying the Rally tasks.
				 *
				 * @returns	Summary report is saved to $scope.projectcSummary.
				 */
				$scope.getProjectSummaryReport = function(token) {
					$scope.inQuerying = true;
					$scope.projectSummary = {};
					if (!token) {
						token = rallyAuthService.getAuthenticationToken();
					}

					$scope.summaryByProject($scope.sprint, token)
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
						.finally(function () { $scope.inQuerying = false; });;
				}

				/**
				 * @name	summaryByProject
				 *
				 * @description	Gets the rally task summary group by Release/ScheduleState
				 *
				 * @param	sprint	The sprint.
				 * @param	token 	The authorization token for querying the Rally tasks.
				 *
				 * @returns	Promise to the summary result.
				 */
				$scope.summaryByProject = function (sprint, token) {
					var stateFunc = function (record) {
						var state = 'Not Start';
						if (record.ScheduleState == 'In-Progress' || record.ScheduleState == 'Completed' || record.ScheduleState == 'Accepted') {
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
				}

				/**
				 * @name	getProjectSummaryReportPeriodically
				 *
				 * @description	After called this function, will gets project summary report periodically
				 *
				 * @returns	The project summary report periodically.
				 */
				$scope.getProjectSummaryReportPeriodically = function () {
					if (!$scope.sprint || $scope.sprint < 1) { return; }

					var token = "ZGFtZW5nLnpoYW5nQGNhcmVzdHJlYW0uY29tOjFxYXoyV1NY";

					$scope.getProjectSummaryReport(token);
					$scope.LastUpdate = "Last update at " + new Date().toLocaleTimeString();
					setTimeout($scope.getProjectSummaryReportPeriodically, 60000 * 10);
				}

				/**
				 * @name	reportError
				 *
				 * @description	Reports an error
				 *
				 * @param	error	The error object.
				 *
				 */
				function reportError(error) {
					console.error(error.statusText);
					if (error.statusText === $scope.RALLY_INTERNAL_ERROR) {
						$scope.ErrorMsg = error.QueryResult.Errors.join(' || ');
					} else {
						$scope.ErrorMsg = error.statusText;
					}
				}
			}]);
	});
