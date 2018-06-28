'use strict';

define(['app', 'underscore'],
	function (app, _) {
		app.controller('rallyTaskController', [
			'$scope',
			'$rootScope',
			'$http',
			'$q',
			'rallyAuthService',
			'rallyTaskQueryService',

			function ($scope, $rootScope, $http, $q, rallyAuthService, rallyTaskQueryService) {
				var LOCAL_STORAGE_KEY = 'rallyTaskQueryAccount';
				$scope.RALLY_INTERNAL_ERROR = 'RallyInternalError';
				$scope.TaskList = [];
				$scope.UserId = '';
				$scope.UserPwd = '';
				$scope.owner = '';
				$scope.inQuerying = false;
				$scope.ErrorMsg = '';
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
									, 'yong.han@carestream.com'
									, 'jason.wang@carestream.com'
									, 'changzheng.feng@carestream.com'
									, 'cheng.luo@carestream.com'
									, 'lei.liu@carestream.com'
									, 'dean.peng@carestream.com'
				];

				$scope.CanUseLocalStorage = rallyAuthService.CanUseLocalStorage;

				// temp
				$scope.name = 'parent name';

				$scope.clearError = function () {
					$scope.ErrorMsg = '';
				}

				$scope.refreshTaskList = function () {
					$scope.clearError();
					return $scope.refreshTaskByOwner($scope.owner, true, $q);
				};

				$scope.refreshAll = function () {
					$scope.typicalQuery = false;
					$scope.clearError();
					$scope.TaskList = [];

					_.each($scope.emailList, function (email) {
						$scope.refreshTaskByOwner(email, false, $q);
					})
				};

				$scope.refreshTaskByOwner = function (owner, clearDataFirst, q) {
					if (clearDataFirst) { $scope.TaskList = []; }

					$scope.inQuerying = true;
					var token = rallyAuthService.getAuthenticationToken();
					q.all([
							rallyTaskQueryService.getTasksFromRally(owner, 'hierarchicalrequirement', true, token),
							rallyTaskQueryService.getTasksFromRally(owner, 'defect', true, token)
					])
						.then(function (lists) {
							$scope.TaskList = _.union($scope.TaskList, lists[0], lists[1]);
						}, function (error) {
							console.error(error.statusText);
							if (error.statusText === $scope.RALLY_INTERNAL_ERROR) {
								$scope.ErrorMsg = error.QueryResult.Errors.join(' || ');
							} else {
								$scope.ErrorMsg = error.statusText;
							}
						})
						.finally(function () {
							$scope.inQuerying = false;
						});
				};
			}]);
	});
