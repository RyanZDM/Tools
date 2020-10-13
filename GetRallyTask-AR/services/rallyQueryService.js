'use strict';

define(['jquery', 'underscore', 'moment', 'app'], function ($, _, moment, app) {
	/**
	 * @name rallyQueryService
	 *
	 * @description - service for querying info from Rally
	 */
	app.service('rallyQueryService', ['$http', '$q', 'rallyRestApi', function ($http, q, rallyRestApi) {
		// A GET request, which requires a HTTP Basic Authentication header, to the following endpoint provides the security token:
		// https://rally1.rallydev.com/slm/webservice/v2.0/security/authorize

		/**
		 * @name xhrGet
		 *
		 * @description		Query to Rally via the typical way
		 *
		 * @param type		"task" (defect or user story), or "feature"
		 * @param url			The url(RESTful API) to the Rally for getting the info
		 * @param authToken	The token string to be sent to Rally for the authentication
		 * @param async		true if need a async call
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
		 * @name jQueryGet
		 *
		 * @description		Query to Rally via the JQuery
		 *
		 * @param type		"task" (defect or user story), or "feature"
		 * @param url			The url(RESTful API) to the Rally for getting the info
		 * @param authToken	The token string to be sent to Rally for the authentication
		 * @param async		true if need a async call
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
		 * @name angularJsGet
		 *
		 * @description		Query to Rally by using the AngularJS $http
		 *
		 * @param type		"task" (defect or user story), or "feature"
		 * @param httpSvc		A HTTP service for Ajax call, uses the $http in this service
		 * @param url			The url(RESTful API) to the Rally for getting the info
		 * @param authToken	The token string to be sent to Rally for the authentication
		 * @param async		true if need a async call
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
		 * @name getList
		 *
		 * @description		Analyze the JSON object and return the list against on the target type
		 *
		 * @param type		"task" (defect or user story), or "feature"
		 * @param jsonObj		The json object contains records get from Rally
		 *
		 *return			The Rally record collection
		 */
		function getList(type, jsonObj) {
			var lowerType = type.toLowerCase();
			if (lowerType === "task" || lowerType === "warning") return getTaskList(jsonObj);
			if (lowerType === "feature") return getFeatureList(jsonObj);

			return [];
		}

		/**
		 * @name getFeatureList
		 *
		 * @description		Analyze the JSON object and return the Rally feature list
		 *
		 * @param jsonObj		The json object contains Rally features
		 *
		 * @return			The Rally feature collection
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
		 * @name getTaskList
		 *
		 * @description		Analyze the JSON object and return the Rally task list
		 *
		 * @param jsonObj		The json object contains Rally defects and/or user stories
		 *
		 * @return			The Rally task collection
		 */
		function getTaskList(jsonObj) {
			if (!jsonObj || !jsonObj.QueryResult || !jsonObj.QueryResult.Results || jsonObj.QueryResult.Results.length < 1) return [];

			var taskList = [];
			var today = moment().format('YYYYMMDD');
			for (var index in jsonObj.QueryResult.Results) {
				var task = new RallyTask(jsonObj.QueryResult.Results[index]);
				task.WasChangedToday = false;
				if (task['FlowStateChangedDate'] && task['FlowStateChangedDate'] !== '') {
					var changeDate = moment(task['FlowStateChangedDate']).format('YYYYMMDD');
					if (changeDate === today) { task.WasChangedToday = true; }
				}
				taskList[taskList.length] = task;
			}

			return taskList;
		}

		/**
		 * @name getWarningReport
		 *
		 * @description		Get the warning report data
		 *
		 * @param token		The authentication token
		 *
		 * @return			The Rally warning report by category
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
		 * @name getSingleWarningReport
		 *
		 * @description		Get the warning items according to the single provided condition
		 *
		 * @return			The warning items
		 */
		function getSingleWarningReport($http, url, token, category, desc) {
			var deferred = $.Deferred();
			angularJsGet("warning", $http, url, token, true).then(function (data) {
				deferred.resolve({ Category: category, Desc: desc, Data: data });
			});

			return deferred.promise();
		}

		/**
		 * @name	function mergeWarningReport(data)
		 *
		 * @description	Merge warning report
		 *
		 * @author	Ryan
		 * @date	10/10/2019
		 *
		 * @param	data	The data.
		 *
		 * @returns	.
		 */
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
		 * @name				reCalculateTaskSpentTime
		 *
		 * @description		Calculate the total time spent of a defect or user story by cumulating the Actuals of all the sub tasks.
		 *					Those sub tasks would be excluded if the owner is the other one
		 *
		 * @param taskList	The collection of Rally defects and/or user stories
		 * @param authToken	The token string to be sent to Rally for the authentication
		 */
		function reCalculateTaskSpentTime(taskList, authToken) {
			var promises = [];
			//var ownerEmailList = Object.keys(rallyRestApi.OwnerEmailMapping);
			taskList.forEach(function (task) {
				if (task.TaskLink !== '') {
					var deferred = $.Deferred();
					$http.get(rallyRestApi.getApiUrlSubTask(task.TaskLink), { headers: { "Authorization": "Basic " + authToken } })
						.then(function (data) {
							// accumulate the total time spent hours if have one more owner for this task
							data.data.QueryResult.Results.forEach(function(subTask) {
								if ($.isNumeric(subTask.Actuals) && subTask.Actuals > 0) {
									if (subTask["Owner"] && task.Owner !== subTask.Owner._refObjectName) {
										// If the task is assigned to different owner, create a new Task for it.
										// If the owner of sub task is null, assume it is the same with parent
										var otherOwner = subTask.Owner._refObjectName;
										var anotherTask = {
											Owner: otherOwner,
											Actuals: subTask.Actuals,
											State: subTask.State,
											FormattedID: subTask.FormattedID,
											Title: subTask.Name
										};
										if (task["OtherOwnerTasks"]) {
											task.OtherOwnerTasks.push(anotherTask);
										} else {
											task["OtherOwnerTasks"] = [anotherTask];
										}
									}
								}
							});

							if (task["OtherOwnerTasks"]) { // Contains at least one task which belong to the different owner
								var groupTasks = _.groupBy(task.OtherOwnerTasks, function (element) { return element.Owner; });
								var mergedTasks = _.map(groupTasks, function (value, key) {
									var state = "";
									var subTasks = "";
									var totalTimeSpent = _.reduce(task.OtherOwnerTasks, function (result, current) {
										// State: Defined, In-Progress, Completed
										if (state !== current.State) {
											switch (state) {
												case "In-Progress":	// Should be In-Progress
													break;
												case "Completed":	// Should be the same with new value
													state = current.State;
													break;
												case "Defined":		// Should be the same with new value except that the new state is Completed
													if (current.State !== "Completed") { state = current.State; }
													break;
												default:
													state = current.State;
											}
										}

										subTasks = current.FormattedID + " ";

										return result + ((current.Owner === key) ? current.Actuals : 0);
									}, 0);

									var otherTask = task.clone("OtherOwnerTasks");
									otherTask.Owner = key;
									otherTask.Actuals = totalTimeSpent;
									otherTask.ScheduleState = state;
									otherTask.SubTasks = subTasks;
									otherTask.id = task.id + " (" + otherTask.SubTasks.trimRight() + ")";
									//otherTask.Title = 
									otherTask.FakeTask = true;	// This is not a real Rally task
									return otherTask;
								});

								// Reformat the other owner tasks
								task.OtherOwnerTasks = Array.from(Object.values(mergedTasks));
							}

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

			getOpenDefectCRP2: function (token) {
				return angularJsGet("task", $http, rallyRestApi.UrlOpenDefectCRP2, token, true);
			},

			getFromRally: function(url, token) {
				return angularJsGet("task", $http, url, token, true);
			},
			
			getWarningReport: getWarningReport,

			reCalculateTaskSpentTime: reCalculateTaskSpentTime
		}
	}]);
});