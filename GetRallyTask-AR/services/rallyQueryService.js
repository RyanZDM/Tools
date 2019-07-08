'use strict';

define(['jquery', 'underscore', 'app'], function ($, _, app) {
	/**
	 * @name rallyQueryService
	 *
	 * @description - service for querying info from Rally
	 */
	app.service('rallyQueryService', ['$http', '$q', 'rallyRestApi', function ($http, q, rallyRestApi) {
		// A GET request, which requires a HTTP Basic Authentication header, to the following endpoint provides the security token:
		// https://rally1.rallydev.com/slm/webservice/v2.0/security/authorize

		/**
		 *name xhrGet
		 *
		 *description		Query to Rally via the typical way
		 *
		 *param type		"task" (defect or user story), or "feature"
		 *param url			The url(RESTful API) to the Rally for getting the info
		 *param authToken	The token string to be sent to Rally for the authentication
		 *param async		true if need a async call
		 */
		function xhrGet(type, url, authToken, async) {
			var deferred = $.Deferred();
			var xhr = new XMLHttpRequest();
			xhr.open('GET', url, async);
			if (authToken) { xhr.setRequestHeader("Authorization", "Basic " + authToken); }

			xhr.onload = function (e) {
				if (xhr.readyState === 4) {
					//if (xhttp.status === 200) {
					console.log(xhr.responseText);
					var result = JSON.parse(xhr.responseText);
					var list = getList(type, result);
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

		/**
		 *name jQueryGet
		 *
		 *description		Query to Rally via the JQuery
		 *
		 *param type		"task" (defect or user story), or "feature"
		 *param url			The url(RESTful API) to the Rally for getting the info
		 *param authToken	The token string to be sent to Rally for the authentication
		 *param async		true if need a async call
		 */
		function jQueryGet(type, url, authToken, async) {
			var deferred = $.Deferred();
			$.ajax({
				method: 'GET',
				url: url,
				async: async,
				headers: { "Authorization": "Basic " + authToken },
				xhrFields: { withCredentials: false }
			})
				.done(function (data) {
					if (data.QueryResult.Errors.length > 0) {
						data.statusText = 'RallyInternalError';
						deferred.reject(data);
					} else {
						var list = getList(type, data);
						deferred.resolve(list);
					}
				})
				.fail(function (error) {
					console.error(error.statusText);
					deferred.reject(error);
				});

			return deferred.promise();
		}

		/**
		 *name angularJsGet
		 *
		 *description		Query to Rally by using the AngularJS $http
		 *
		 *param type		"task" (defect or user story), or "feature"
		 *param httpSvc		A HTTP service for Ajax call, uses the $http in this service
		 *param url			The url(RESTful API) to the Rally for getting the info
		 *param authToken	The token string to be sent to Rally for the authentication
		 *param async		true if need a async call
		 */
		function angularJsGet(type, httpSvc, url, authToken, async) {
			// async is useless for $http
			var deferred = $.Deferred();
			httpSvc.get(url, { headers: { "Authorization": "Basic " + authToken }, "withCredentials": false })
					.then(function (data) {
						if (data.data.QueryResult.Errors && data.data.QueryResult.Errors.length > 0) {
							data.data.statusText = 'RallyInternalError';
							deferred.reject(data.data);
						} else {
							var list = getList(type, data.data);
							deferred.resolve(list);
						}
					},
						function (error) {
							console.error(error.statusText);
							deferred.reject(error);
						});

			return deferred.promise();
		}

		/**
		 *name getList
		 *
		 *description		Analyze the JSON object and return the list against on the target type
		 *
		 *param type		"task" (defect or user story), or "feature"
		 *param jsonObj		The json object contains records get from Rally
		 *
		 *return			The Rally record collection
		 */
		function getList(type, jsonObj) {
			var lowerType = type.toLowerCase();
			if (lowerType == "task" || lowerType == "warning") return getTaskList(jsonObj);
			if (lowerType == "feature") return getFeatureList(jsonObj);
		}

		/**
		 *name getFeatureList
		 *
		 *description		Analyze the JSON object and return the Rally feature list
		 *
		 *param jsonObj		The json object contains Rally features
		 *
		 *return			The Rally feature collection
		 */
		function getFeatureList(jsonObj) {
			if (!jsonObj || !jsonObj.QueryResult || !jsonObj.QueryResult.Results || jsonObj.QueryResult.Results.length < 1) return [];

			var featureList = [];
			for (var index in jsonObj.QueryResult.Results) {
				var feature = new RallyFeature(jsonObj.QueryResult.Results[index]);
				featureList[featureList.length] = feature;
			}

			return featureList;
		}

		/**
		 *name getTaskList
		 *
		 *description		Analyze the JSON object and return the Rally task list
		 *
		 *param jsonObj		The json object contains Rally defects and/or user stories
		 *
		 *return			The Rally task collection
		 */
		function getTaskList(jsonObj) {
			if (!jsonObj || !jsonObj.QueryResult || !jsonObj.QueryResult.Results || jsonObj.QueryResult.Results.length < 1) return [];

			var taskList = [];
			for (var index in jsonObj.QueryResult.Results) {
				var task = new RallyTask(jsonObj.QueryResult.Results[index]);
				taskList[taskList.length] = task;
			}

			return taskList;
		}

		/**
		 *name getWarningReport
		 *
		 *description		Get the warning report data
		 *
		 *param token		The authentication token
		 *
		 *return			The Rally warning report by category
		 */
		function getWarningReport(token) {
			var deferred = q.defer();
			var promises = [];
			var categories = rallyRestApi.UrlWarnings;
			for (var cate in categories) {
				var warning = categories[cate];
				
				_.each(warning.Urls, function (url) {
					promises.push(getSingleWarningReport($http, url, token, cate, warning.Desc).then(function (data) {
						return data;
					}));
				});
			};

			q.all(promises).then(function (data) {
				deferred.resolve(mergeWarningReport(data));
			});

			return deferred.promise;
		};

		/**
		 *name getSingleWarningReport
		 *
		 *description		Get the warning items according to the single provided condition
		 *
		 *return			The warning items
		 */
		function getSingleWarningReport($http, url, token, category, desc) {
			var deferred = $.Deferred();
			angularJsGet("warning", $http, url, token, true).then(function (data) {
				deferred.resolve({ Category: category, Desc: desc, Data: data });
			});

			return deferred.promise();
		}

		function mergeWarningReport(data) {
			var reports = [];
			_.each(data, function (item) {
				var found = _.find(reports, function (rpt) { return rpt.Category === item.Category });
				if (found) {
					found.Data = _.union(found.Data, item.Data);
				} else {
					reports.push({ Category: item.Category, Desc: item.Desc, Data: item.Data });
				}
			});

			return reports;
		}

		/**
		 *name				reCalculateTaskSpentTime
		 *
		 *description		Calculate the totoal time spent of a defect or user story by cumulate the Actuals of all the sub tasks.
		 *					Those sub tasks would be excluded if the owner is the other one
		 *
		 *param taskList	The collection of Rally defects and/or user stories
		 *param authToken	The token string to be sent to Rally for the authentication
		 */
		function reCalculateTaskSpentTime(taskList, authToken) {
			var promises = [];
			var ownerEmailList = Object.values(rallyRestApi.OwnerEmailMapping);
			taskList.forEach(function (task) {
				if (task.TaskLink !== '') {
					var deferred = $.Deferred();
					$http.get(rallyRestApi.getApiUrlSubTask(task.TaskLink), { headers: { "Authorization": "Basic " + authToken } })
						.then(function (data) {
							var actuals = 0;
							// accumulate the totoal time spent hours
							data.data.QueryResult.Results.forEach(function (subTask) {
								if ($.isNumeric(subTask.Actuals) && subTask.Actuals > 0) {
									if (subTask["Owner"]) {
										if (task.Owner === subTask.Owner._refObjectName) {
											actuals = actuals + subTask.Actuals;
										} else {	// Found the task with the different owner, create a new Task for it. But would not create new task if he/she is not in the email list
											var otherOwner = subTask.Owner._refObjectName.toLowerCase();
											if (ownerEmailList.indexOf(otherOwner) != -1) {
												var anotherTask = { Owner: otherOwner, Actuals: subTask.Actuals };
												if (task["OtherOwnerTasks"]) {
													task.OtherOwnerTasks.push(anotherTask);
												} else {
													task["OtherOwnerTasks"] = [anotherTask];
												}
											}
										}
									}
								}
							})

							if (task["OtherOwnerTasks"]) { // Contains at least one task which belong to the different owner
								var groupTasks = _.groupBy(task.OtherOwnerTasks, function (element) { return element.Owner; });
								var mergedTasks = _.map(groupTasks, function (value, key) {
									var totalTimeSpent = _.reduce(task.OtherOwnerTasks, function (result, current) {
										return result + ((current.Owner === key) ? current.Actuals : 0);
									}, 0);

									var otherTask = new RallyTask({});
									otherTask.id = task.id;
									otherTask.Link = task.Link;
									otherTask.Description = task.Description;
									otherTask.Iteration = task.Iteration;
									otherTask.Owner = key;
									otherTask.Actuals = totalTimeSpent;
									otherTask.Estimate = totalTimeSpent / 6;	// Assume 6 working hours a day
									otherTask.ScheduleState = task.ScheduleState;
									return otherTask;
								});

								// Reformat the other owner tasks
								task.OtherOwnerTasks = Array.from(Object.values(mergedTasks));
							}

							if (actuals > 0) { task.Actuals = actuals; }
							deferred.resolve(task);
						},
							function (error) {
								console.error(error.statusText);
								deferred.reject(error);
							});
					promises.push(deferred.promise());
				};
			});

			return promises;
		}

		return {
			getTasksFromRally: function (parameters, target) {
				return angularJsGet("task", $http, rallyRestApi.getApiUrlTask(parameters, target), parameters.Token, parameters.Async);
			},

			getTasksFromRallyJQuery: function (parameters, target) {
				return jQueryGet("task", rallyRestApi.getApiUrlTask(parameters, target), parameters.Token, parameters.Async);
			},

			getFeatureFromRally: function (release, token) {
				return angularJsGet("feature", $http, rallyRestApi.getApiUrlFeature(release), token, true);
			},

			getWarningReport: getWarningReport,

			reCalculateTaskSpentTime: reCalculateTaskSpentTime,
		}
	}]);
});