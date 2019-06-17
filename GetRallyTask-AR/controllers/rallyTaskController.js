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
					$scope.clearError();
					return $scope.refreshTaskByOwner({ 'Owner': $scope.owner, 'Sprint': $scope.sprint, 'IgnoreScheduleState':$scope.IgnoreScheduleState, 'ClearDataFirst': true }, $q);
				};

				$scope.refreshAll = function () {
					$scope.clearError();
					$scope.TaskList = [];

					_.each($scope.emailList, function (email) {
						$scope.refreshTaskByOwner({ 'Owner': email, 'Sprint': $scope.sprint, 'IgnoreScheduleState': $scope.IgnoreScheduleState, 'ClearDataFirst': false }, $q);
					})
				};

				$scope.refreshTaskByOwner = function (parameters, q) {
					if (parameters.ClearDataFirst) { $scope.TaskList = []; }

					$scope.inQuerying = true;
					var token = rallyAuthService.getAuthenticationToken();
					_.extend(parameters, { 'Token': token, 'Async': true });
					q.all([
					rallyQueryService.getTasksFromRally(parameters, 'hierarchicalrequirement'),
					rallyQueryService.getTasksFromRally(parameters, 'defect')
					])
						.then(function (lists) {
							// If directly Complete the user story or defect under which still contains incompleted tasks
							// the SpentTime of those taks would not be counted any more. So need to accumulate all task hours
							var tasks = _.union(lists[0], lists[1]);

							$scope.TaskList = _.union($scope.TaskList, tasks);
							q.all(rallyQueryService.reCalculateTaskSpentTime(tasks, token))
								.then(function (updatedTasks) {
									// A user story or defect may contains some tasks assigned to different developer, need to filter out
									var otherOwnerTasks = _.flatten(_.filter(_.pluck(updatedTasks, "OtherOwnerTasks"), function (other) { return other !== undefined }));
									$scope.TaskList = _.union($scope.TaskList, updatedTasks, otherOwnerTasks);
								})
								.catch(function (error) { reportError(error); })
								.finally(function () { $scope.inQuerying = false; });
						})
						.catch(function (error) { reportError(error); });
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
