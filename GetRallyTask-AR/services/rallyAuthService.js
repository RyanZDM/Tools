'use strict';

define(['app', 'underscore'], function (app, _) {
	app.service('rallyAuthService', ['$rootScope', function ($rootScope) {
		var LOCAL_STORAGE_KEY = 'rallyTaskQueryAccount';

		function canUseLocalStorage() {
			return (typeof (Storage) !== 'undefined');
		};

		function updateLocalStorage(userId, pwd) {
			if (!canUseLocalStorage()) return;

			localStorage.setItem(LOCAL_STORAGE_KEY, userId + ':' + pwd);
		};

		var authService = {
			CanUseLocalStorage: canUseLocalStorage(),

			getTokenFromLocalStorage: function () {
				if (!canUseLocalStorage) return undefined;

				return localStorage.getItem(LOCAL_STORAGE_KEY);
			},

			getAuthenticationToken: function() {
				if (!$rootScope.Globals) return undefined;

				return $rootScope.Globals.AuthenticationToken;
			},

			toggleRememberSetting: function (scope) {
				if (!canUseLocalStorage) return;

				if (scope.RememberAccount) {
					updateLocalStorage(scope.UserId, scope.UserPwd);
				} else {
					localStorage.removeItem(LOCAL_STORAGE_KEY);
				}
			},

			updateAuthToken: function (userId, pwd) {
				var token = btoa(userId + ':' + pwd);
				if ($rootScope.Globals) {
					_.extend($rootScope.Globals, { AuthenticationToken: token });
				} else {
					$rootScope.Globals = { AuthenticationToken: token };
				}
				return token;
			},

			updateLocalStorage: function (userId, pwd) {
				updateLocalStorage(userId, pwd);
			}
		};

		return authService;
	}]);
});