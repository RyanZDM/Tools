'use strict';

define(['jquery', 'app'], function ($, app) {
	app.service('rallyTaskQueryService', ['$http', function ($http) {
		// A GET request, which requires a HTTP Basic Authentication header, to the following endpoint provides the security token:
		// https://rally1.rallydev.com/slm/webservice/v2.0/security/authorize

		function xhrGet(url, authToken, async) {
			var deferred = $.Deferred();
			var xhr = new XMLHttpRequest();
			xhr.open('GET', url, async);
			if (authToken) { xhr.setRequestHeader("Authorization", "Basic " + authToken); }

			xhr.onload = function (e) {
				if (xhr.readyState === 4) {
					//if (xhttp.status === 200) {
					console.log(xhr.responseText);
					var result = JSON.parse(xhr.responseText);
					var list = getTaskList(result);
					deferred.resolve(list);
					//} else {
					//	console.error(xhttp.statusText);
					//	deferred.reject(error);
					//}
				}
			};

			xhr.onerror = function (e) {
				console.error(xhr.statusText);
				deferred.reject(error);
			}

			xhr.send(null);

			return deferred.promise();
		}

		function jQueryGet(url, authToken, async) {
			var deferred = $.Deferred();
			$.ajax({
				method: 'GET',
				url: url,
				async: async,
				headers: { "Authorization": "Basic " + authToken }
			})
				.done(function (data) {
					if (data.QueryResult.Errors.length > 0) {
						data.statusText = 'RallyInternalError';
						deferred.reject(data);
					} else {
						var list = getTaskList(data);
						deferred.resolve(list);
					}
				})
				.fail(function (error) {
					console.error(error.statusText);
					deferred.reject(error);
				});

			return deferred.promise();
		}

		function angularJsGet(httpSvc, url, authToken, async) {
			// async is useless for $http
			var deferred = $.Deferred();
			httpSvc.get(url, { headers: { "Authorization": "Basic " + authToken } })
					.then(function (data) {
						if (data.data.QueryResult.Errors.length > 0) {
							data.data.statusText = 'RallyInternalError';
							deferred.reject(data.data);
						} else {
							var list = getTaskList(data.data);
							deferred.resolve(list);
						}
					},
						function (error) {
							console.error(error.statusText);
							deferred.reject(error);
						});

			return deferred.promise();
		}

		function getTaskList(jsonObj) {
			if (!jsonObj || !jsonObj.QueryResult || !jsonObj.QueryResult.Results || jsonObj.QueryResult.Results.length < 1) return [];

			var taskList = [];
			for (var index in jsonObj.QueryResult.Results) {
				var task = new Task(jsonObj.QueryResult.Results[index]);
				taskList[taskList.length] = task;
			}

			return taskList;
		}

		function Task(jsonObj) {
			this.id = ('FormattedID' in jsonObj) ? jsonObj['FormattedID'] : '';
			this.Link = ('_ref' in jsonObj) ? jsonObj['_ref'].toLowerCase()
															.replace('slm/webservice/v2.0', '#/90211740268ud/detail')
															.replace('hierarchicalrequirement', 'userstory') : '';
			this.Description = ('Name' in jsonObj) ? jsonObj['Name'] : '';
			this.Estimate = (jsonObj['PlanEstimate']) ? jsonObj['PlanEstimate'] : 0;
			this.TimeSpent = (jsonObj['TaskEstimateTotal']) ? jsonObj['TaskEstimateTotal'] : 0;
			this.Owner = '';
			this.Iteration = '';

			(function (that) {
				if (jsonObj['Owner'] && jsonObj.Owner['_refObjectName']) {
					that.Owner = jsonObj.Owner._refObjectName;
				}

				if (jsonObj['Iteration'] && jsonObj.Iteration['_refObjectName']) {
					var sprint = jsonObj.Iteration._refObjectName.split(' ').pop();
					that.Iteration = parseInt(sprint, 10);
				}
			})(this);
		}

		// <target> must be either 'defect' or 'hierarchicalrequirement', the blank spack befor and operator are MUST
		var apiUrl = 'https://rally1.rallydev.com/slm/webservice/v2.0/\
					<target>?\
					query=(((AcceptedDate >= "2018-01-01") OR (InProgressDate >= "2018-01-01")) and (\
						(Owner.Name = <owner> )\
						 and ((ScheduleState = Accepted) OR (ScheduleState = Completed))\
						))\
					&order=Iteration,LastUpdateDate\
					&fetch=FormattedID,Name,Owner,PlanEstimate,TaskEstimateTotal,Iteration\
					&pagesize=1999';

		return {
			getTasksFromRally: function (owner, target, async, token) {
				return angularJsGet($http, apiUrl.replace('<target>', target).replace('<owner>', owner), token, async);
			},

			getTasksFromRallyJQuery: function (owner, target, async, token) {
				return jQueryGet(apiUrl.replace('<target>', target).replace('<owner>', owner), token, async);
			}
		}
	}]);
});