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

			function ($scope, $rootScope, $http, $q, rallyAuthService, rallyQueryService) {
				$scope.RALLY_INTERNAL_ERROR = 'RallyInternalError';
				$scope.TaskList = [];
				$scope.UserId = '';
				$scope.UserPwd = '';
				$scope.owner = '';
				$scope.inQuerying = false;
				$scope.ErrorMsg = '';
				$scope.sprint = 0;
				$scope.emailList = ['dameng.zhang@carestream.com'
									, 'joe.zhang@carestream.com'
									, 'qinqiang.yan@carestream.com'
									, 'jiandong.gu@carestream.com'
									, 'qi.wang@carestream.com'
									, 'gary.liu@carestream.com'
									, 'liang.ma@carestream.com'
									, 'jun.sun@carestream.com'
									, 'zhe.sun@carestream.com'
									, 'yao.jiaxin@carestream.com'
									, 'xianjun.zhan@carestream.com'
									, 'lili.jiang@carestream.com'
									, 'changzheng.feng@carestream.com'
									, 'cheng.luo@carestream.com'
									, 'lei.liu@carestream.com'
									, 'dean.peng@carestream.com'
				];

				$scope.CanUseLocalStorage = rallyAuthService.CanUseLocalStorage;

				$scope.clearError = function () {
					$scope.ErrorMsg = '';
				}

				$scope.refreshTaskList = function () {
					$scope.clearError();
					return $scope.refreshTaskByOwner($scope.owner, $scope.sprint, true, $q);
				};

				$scope.refreshAll = function () {
					$scope.clearError();
					$scope.TaskList = [];

					_.each($scope.emailList, function (email) {
						$scope.refreshTaskByOwner(email, /*0*/$scope.sprint, false, $q);
					})
				};

				$scope.refreshTaskByOwner = function (owner, sprint, clearDataFirst, q) {
					if (clearDataFirst) { $scope.TaskList = []; }

					$scope.inQuerying = true;
					var token = rallyAuthService.getAuthenticationToken();
					q.all([
					rallyQueryService.getTasksFromRally(owner, sprint, 'hierarchicalrequirement', true, token),
					rallyQueryService.getTasksFromRally(owner, sprint, 'defect', true, token)
					])
						.then(function (lists) {
							// If directly Complete the user story or defect under which still contains incompleted tasks
							// the SpentTime of those taks would not be counted any more. So need to accumulate all task hours
							var tasks = _.union(lists[0], lists[1]);
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
