'use strict';

define(['app', 'underscore'],
	function (app, _) {
		app.controller('rallyTaskController', [
			'$scope',
			'$rootScope',
			'$http',
			'$q',
			'rallyAuthService',
			'rallyQueryService',
			'rallyRestApi',

			function ($scope, $rootScope, $http, $q, rallyAuthService, rallyQueryService, rallyRestApi) {
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
				$scope.CanUseLocalStorage = rallyAuthService.CanUseLocalStorage;
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
				loadSavedParameters();

				function saveCurrentParameters() {
					if (!$scope.CanUseLocalStorage) { return; }

					localStorage.setItem($scope.SAVED_PARAMETERS, $scope.owner + ':' + $scope.sprint + ':' + $scope.Show13a + ':' + $scope.Show13b + ':' + $scope.Show14a + ':' + $scope.Show14b + ':' + $scope.ShowOthers);
				}

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

				$scope.refreshAll = function () {
					$scope.inQuerying = true;
					$scope.clearError();
					$scope.TaskList = [];
					$scope.resetWorkloadStat();
					saveCurrentParameters();

					var promises = [];
					_.each($scope.emailList, function (email) {
						promises.push($scope.refreshTaskByOwner({ 'Owner': email, 'Sprint': $scope.sprint, 'IgnoreScheduleState': $scope.IgnoreScheduleState, 'ClearDataFirst': false }, $q));
					})

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

					if (!$scope.IgnoreScheduleState) return true;

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
				}

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
				$scope.collectWorkloadStatData = function () {
					if (!$scope.filteredRecords) {
						$scope.workloadStat = {};
						return false;
					}

					if ($scope.workloadStat['Collected'] && $scope.workloadStat.Collected) {
						return true;
					};

					// -- For chart display
					$scope.workloadStat.ChartSeries = ['Series A', 'Series B'];
					$scope.workloadStat.ChartOptions = [];

					$scope.workloadStat.ChartLabels = [];
					$scope.workloadStat.ChartData = [];
					var days = [];
					var hours = [];
					// --------------- End

					if ($scope.filteredRecords.length > 0) {
						var result = $scope.filteredRecords.reduce(function (total, task) {
							var actuals = (task.Actuals) ? task.Actuals : 0;
							if (!(task.Owner in total)) {
								total[task.Owner] = { Days: task.Estimate, Hours: actuals, Count: 1, Name: task.Owner };
							} else {
								total[task.Owner].Days += task.Estimate;
								total[task.Owner].Hours += actuals;
								total[task.Owner].Count += 1;
								total[task.Owner].Name = task.Owner;
							}

							return total;
						}, {});

						$scope.workloadStat.WorkLoad = result;

						// For chart display
						$scope.workloadStat.ChartLabels = Object.keys(result);
						Object.values(result).forEach(function (data) {
							days.push(data.Days);
							hours.push(data.Hours);
						});

						$scope.workloadStat.ChartData.push(days);
						$scope.workloadStat.ChartData.push(hours);
						$scope.workloadStat.ChartHeight = $scope.workloadStat.ChartLabels.length * 10;
					}

					$scope.workloadStat.Collected = true;

					return true;
				};

				$scope.resetWorkloadStat = function () {
					$scope.workloadStat = {};
				}

				$scope.checkStatPermision = function () {
					if (document.getElementById('userId').value === 'dameng.zhang@carestream.com') {
						return true;
					} else {
						return false;
					}
				};

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
