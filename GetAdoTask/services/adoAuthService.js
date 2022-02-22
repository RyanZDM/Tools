"use strict";

define(["app", "underscore"], function (app, _) {
	app.constant("LocalStorageKey", { LOCAL_STORAGE_KEY: "adoTaskQueryAccount", 
										SAVED_PARAMETERS: "adoTaskQueryParameters", 
										SAVED_OTHERINFO: "adoTaskOtherInfo" });

	app.service("adoAuthService", ["$rootScope", "LocalStorageKey", function ($rootScope, LocalStorageKey) {
		function canUseLocalStorage() {
			return (typeof (Storage) !== "undefined");
		};

		function updateLocalStorage(userId, pwd) {
			if (!canUseLocalStorage()) return;

			localStorage.setItem(LocalStorageKey.LOCAL_STORAGE_KEY, pwd + ":" + userId);	// the purpose of saving password first is for easy token parsing
		};

		var authService = {
			CanUseLocalStorage: canUseLocalStorage(),

			getTokenFromLocalStorage: function () {
				if (!canUseLocalStorage) return undefined;

				return localStorage.getItem(LocalStorageKey.LOCAL_STORAGE_KEY);
			},

			getAuthenticationToken: function() {
				// temp token
				return btoa(":cellzuwdzjnq4zx2aewg4zfsqx4etz4j3veohuvih5pooemcr35q");
				
				if (!$rootScope.Globals) return undefined;

				return $rootScope.Globals.AuthenticationToken;
			},

			toggleRememberSetting: function (scope) {
				if (!canUseLocalStorage) return;

				if (scope.RememberAccount) {
					updateLocalStorage(scope.UserId, scope.UserPwd);
				} else {
					localStorage.removeItem(LocalStorageKey.LOCAL_STORAGE_KEY);
				}
			},

			updateAuthToken: function (userId, pwd) {
				var token = btoa(userId + ":" + pwd);	// user id empty means uses a token instead of password
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