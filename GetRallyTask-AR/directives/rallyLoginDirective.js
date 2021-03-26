"use strict";

define(["app"], function (app) {
	app.directive("rallyLogin", ["rallyAuthService", function (rallyAuthService) {
		return {
			restrict: "EA",
			template: '<div class="input-group">\
						<span class="input-group-addon">Authorization</span>\
						<input class="form-control" type="text" id="userId" ng-model="UserId" ng-change="onChange()" placeholder="Enter the query account" />\
						<input class="form-control" type="password" id="userPwd" ng-model="UserPwd" ng-change="onChange()" placeholder="Enter password" />\
						<span class="input-group-addon" style="border:0;background:transparent;" ng-show="CanUseLocalStorage"><input type="checkbox" ng-model="RememberAccount" ng-change="toggleRememberSetting()" />&nbsp;Remember</span>\
					</div>',
			link: function (scope, element, attrs) {
				var key;
				if (rallyAuthService.CanUseLocalStorage && (key = rallyAuthService.getTokenFromLocalStorage())) {
					var account = key.split(":");
					scope.RememberAccount = true;
					scope.UserId = (account.length > 0) ? account[0] : "";
					scope.UserPwd = (account.length > 1) ? account[1] : "";
				} else {
					scope.RememberAccount = false;
					scope.UserId = "";
					scope.UserPwd = "";
				}

				rallyAuthService.updateAuthToken(scope.UserId, scope.UserPwd);

				scope.CanUseLocalStorage = rallyAuthService.CanUseLocalStorage;

				scope.onChange = function () {
					rallyAuthService.updateAuthToken(scope.UserId, scope.UserPwd);

					if (scope.RememberAccount) {
						rallyAuthService.updateLocalStorage(scope.UserId, scope.UserPwd);
					}
				};

				scope.toggleRememberSetting = function () {
					rallyAuthService.toggleRememberSetting(scope);
				};
			}
		};
	}]);
});