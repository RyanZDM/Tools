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
				$scope.ShowInDefine = true;
				$scope.ShowDefined = true;
				$scope.ShowWIP = true;
				$scope.ShowCompleted = true;
				$scope.ShowAccepted = true;
				$scope.ShowFailedOnly = false;

				$scope.clearError = function () {
					$scope.ErrorMsg = '';
				}

				$scope.refreshTaskList = function () {
					$scope.inQuerying = true;
					$scope.clearError();
					$scope.TaskList = [];
					$scope.refreshTaskByOwner({ 'Owner': $scope.owner, 'Sprint': $scope.sprint, 'IgnoreScheduleState': $scope.IgnoreScheduleState, 'ClearDataFirst': true }, $q)
						.then(function(result) {
							$scope.TaskList = result;
						})
						.finally(function () { $scope.inQuerying = false; });
				};

				$scope.refreshAll = function () {
					$scope.inQuerying = true;
					$scope.clearError();
					$scope.TaskList = [];

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
					if (!$scope.Show13a && (/1.3a/i.test(task.Release))) return false;

					if (!$scope.Show13b && (/1.3b/i.test(task.Release))) return false;

					if (!$scope.Show14a && (/1.4a/i.test(task.Release))) return false;

					if (!$scope.Show14b && (/1.4b/i.test(task.Release))) return false;

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
