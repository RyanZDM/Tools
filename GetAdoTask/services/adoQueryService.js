"use strict";

define(["jquery", "underscore", "moment", "app"], function ($, _, moment, app) {
	/**
	 * @name adoQueryService
	 * @description - service for querying info from ADO
	 */
	app.service("adoQueryService", ["$http", "$q", "adoRestApi", function ($http, q, adoRestApi) {
		/**
		 * @name xhrGet
		 * @description		Query to ADO via the typical way
		 * @param url			The url(RESTful API) to the ADO for getting the info
		 * @param authToken	The token string to be sent to ADO for the authentication		 
		 */
		function xhrGet(url, authToken) {
			var deferred = $.Deferred();
			var xhr = new XMLHttpRequest();
			xhr.responseType = "json";
			xhr.withCredentials = true;
			xhr.open("GET", url);
			xhr.setRequestHeader("Authorization", "Basic " + authToken);

			xhr.onload = function () {
				if (xhr.status === 200) {
					deferred.resolve(xhr.response);
				} else {
					var err = xhr.status + ":" + xhr.statusText;
					console.error(err);
					deferred.reject(err);
				}
			};

			xhr.onerror = function () {
				var err = xhr.status + ":" + xhr.statusText;
				console.error(err);
				deferred.reject(err);
			}

			xhr.send(null);
			
			return deferred.promise();
		};

		/**
		 * @name xhrPost
		 * @description		Query to ADO via the typical way
		 * @param url		The url(RESTful API) to the ADO for getting the info
		 * @param authToken	The token string to be sent to ADO for the authentication
		 * @param wiql		The wiql
		 */
		function xhrPost(url, authToken, wiql) {
			var deferred = $.Deferred();

			var xhr = new XMLHttpRequest();
			xhr.responseType = "json";
			xhr.withCredentials = true;
			xhr.open("Post", url, true);
			
			xhr.setRequestHeader("Authorization", "Basic " + authToken);
			xhr.setRequestHeader("Content-Type", "application/json");

			xhr.onload = function () {
				if (xhr.status === 200) {
					deferred.resolve(xhr.response);
				} else {
					var err = xhr.status + ":" + xhr.statusText;
					console.error(err);
					deferred.reject(err);
				}
			};

			xhr.onerror = function () {
				var err = xhr.status + ":" + xhr.statusText;
				console.error(err);
				deferred.reject(err);
			}

			xhr.send(wiql);
			
			return deferred.promise();
		};

		/**
		 * @name jQueryGet
		 * @description		Query to ADO via the JQuery
		 * @param url			The url(RESTful API) to the ADO for getting the info
		 * @param authToken	The token string to be sent to ADO for the authentication		 
		 */
		function jQueryGet(url, authToken) {
			var deferred = $.Deferred();
			$.ajax({
				method: "GET",
				url: url,
				dataType: "json",
				headers: { "Authorization": "Basic " + authToken },
				xhrFields: { withCredentials: false }
			})
				.done(function (result) {
					deferred.resolve(result);
				})
				.fail(function (error) {
					deferred.reject(error);
				});

			return deferred.promise();
		};

		/**
		 * @name jQueryPost
		 * @description		Query to ADO via the JQuery
		 * @param url		The url(RESTful API) to the ADO for getting the info
		 * @param wiql		The wiql
		 */
		function jQueryPost(url, authToken, wiql) {
			var deferred = $.Deferred();

			$.ajax({
					method: "POST",
					url: url,
					contentType: "application/json",
					crossDomain: true,
					xhrFields: { withCredentials: false },
					headers: { "Authorization": "Basic " + authToken },
					dataType: "json",
					data: wiql
				})
				.done(function (result) {
					deferred.resolve(result);
				})
				.fail(function (err) {
					deferred.reject(err);
				});

			return deferred.promise();
		};

		/**
		 * @name angularJsGet
		 * @description		Query to ADO by using the AngularJS $http
		 * @param httpSvc		A HTTP service for Ajax call, uses the $http in this service
		 * @param url			The url(RESTful API) to the ADO for getting the info
		 * @param authToken	The token string to be sent to ADO for the authentication
		 */
		function angularJsGet(httpSvc, url, authToken) {
			// async is useless for $http
			var deferred = $.Deferred();
			httpSvc.get(url,
					{
						headers: { "Authorization": "Basic " + authToken },
						withCredentials: false,
						responseType: "json"
					})
					.then(function (result) {
						if (result.status !== 200) {
							var err = result.status + ":" + result.statusText;
							console.error(err);
							deferred.reject(err);
						}

						var list = getList(type, result.data);
						deferred.resolve(list);
					},
						function (error) {
							//console.error(error.statusText);
							deferred.reject(error);
						});

			return deferred.promise();
		};

		/**
		 * @name angularJsPost
		 * @description		Post query to ADO by using the AngularJS $http
		 * @param httpSvc	A HTTP service for Ajax call, uses the $http in this service
		 * @param url		The url(RESTful API) to the ADO for getting the info
		 * @param authToken	The token string to be sent to ADO for the authentication
		 * @param wiql		The WIQL string converted from JSON.stringify(json object). The json object should has a "query" property with the WIQL
		 */
		function angularJsPost(httpSvc, url, authToken, wiql) {
			var deferred = $.Deferred();
			httpSvc.post(url,
					wiql,
					{
						headers: {
							"Authorization": "Basic " + authToken,
							"Content-Type": "application/json"
						},
						withCredentials: true,
						responseType: "json"
					})
				.then(function (result) {
						if (result.status !== 200) {
							var err = result.status + ":" + result.statusText;
							console.error(err);
							deferred.reject(err);
						}
							
						deferred.resolve(result);

					},
					function (error) {
						deferred.reject(error);
					});

			return deferred.promise();
		};

		/**
		 * name getAdoTaskUsingWiql
		 * @param {AngularJS HTTP service} httpSvc
		 * @param {string} url			url to the REST API of ADO
		 * @param {string} wiql			WIQL string
		 * @param {string} authToken	The token string to be sent to ADO for the authentication
		 */
		function getAdoTaskUsingWiql(httpSvc, url, wiql, authToken) {
			var deferred = $.Deferred();
			angularJsPost(httpSvc, url, authToken, JSON.stringify({ "query": wiql }))
							.then(function (result) {
								if (result.status !== 200) {
									var err = result.status + ":" + result.statusText;
									deferred.reject(err);
								}

								var newParams = getParametersForWitQuery(url, result.data.workItems, null);
								if (newParams.length < 1) {
									deferred.reject("Error occurred while getting parameters for WIT query.");
									return;
								}

								var promises = [];
								newParams.forEach(function(qry) {
									promises.push(angularJsPost(httpSvc, qry.url, authToken, JSON.stringify(qry.data)));
								});

								Promise.all(promises)
										.then(function (list) {
											list = _.flatten(_.pluck(_.pluck(list, "data"), "value"));
											deferred.resolve(getWorkItems(adoRestApi, list));
										})
										.catch(function (err) {
											deferred.reject(err);
										});
							},
							function (error) {
								deferred.reject(error);
							});

			return deferred.promise();
		};

		/**
		 * gets the new parameters for getting detail info of work item
		 * @param {string} originalUrl
		 * @param {Array<int>} workItems
		 * @param {null or Array<string>} returnFields
		 */
		function getParametersForWitQuery(originalUrl, workItems, returnFields) {
			var queries = [];
			var newUrl = originalUrl.replace("wiql", "workitemsbatch");
			//var fields = _.pluck(data.columns, "referenceName");	// not allow to use "relations" if specified the fields
			var witIds = _.pluck(workItems, "id");

			// Split to multiple calls since return max 200 records for each query
			var queryCount = Math.ceil(witIds.length / adoRestApi.MaxRecordsEveryQuery);
			for (var i = 0; i < queryCount; i++) {
				var start = i * adoRestApi.MaxRecordsEveryQuery;
				var end = start + adoRestApi.MaxRecordsEveryQuery;
				var newQueryData = { ids: witIds.slice(start, end) };
				if (returnFields && returnFields.length > 0) {
					newQueryData.fields = returnFields;
				} else {
					newQueryData["$expand"] = "relations";
				}
				queries.push({ url: newUrl, data: newQueryData });
			}

			return queries;
		};

		/**
		 * @name getWorkItems
		 * @description		Analyze the JSON object and return the work item list against on the target type
		 * @param restApi	The restApi object
		 * @param itemArray	The json object contains records get from ADO
		 * @return			The ADO record collection
		 */
		function getWorkItems(restApi, itemArray) {
			if (!itemArray || itemArray.length === 0) return [];

			var today = moment().format("YYYYMMDD");
			var witList = [];
			itemArray.forEach(function(item) {
				var wit = new adoWorkItem(restApi, item);

				wit.WasChangedToday = false;
				if (wit.StateChangeDate) {
					var changeDate = moment(wit.StateChangeDate).format("YYYYMMDD");
					if (changeDate === today) { wit.WasChangedToday = true; }
				}

				witList[witList.length] = wit;
			});

			return witList;
		};
		
		/**
		 * @name getFeatureList
		 * @description		Analyze the ADO feature list
		 * @return			The ADO feature collection
		 */
		function getFeatureList(authToken) {
			var wiql = adoRestApi.TemplateWiqlFeatureList;
			var url = adoRestApi.TemplateWiqlQuery;

			var deferred = $.Deferred();
			jQueryPost(url, authToken, JSON.stringify({ "query": wiql }))
				.then(function (result) {
						var newParams = getParametersForWitQuery(url, result.workItems, ["System.Title"]);
						if (newParams.length < 1) {
							deferred.reject("Error occurred while getting parameters for WIT query.");
							return;
						}

						var promises = [];
						newParams.forEach(function(qry) {
							promises.push(jQueryPost(qry.url, authToken, JSON.stringify(qry.data)));
						});

						Promise.all(promises)
							.then(function (list) {
								list = _.flatten(_.pluck(list, "value"));

								var featureList = [];
								list.forEach(function(feature) {
									featureList.push(new adoFeature(feature, adoRestApi.WitLink));
								});
								deferred.resolve(featureList);
							})
							.catch(function (err) {
								deferred.reject(err);
							});
					},
					function (error) {
						deferred.reject(error);
					});

			return deferred.promise();
		};

		/**
		 * @name			reCalculateTaskSpentTime
		 * @description		Calculate the total time spent of a defect or user story by cumulating the Actuals of all the sub tasks.
		 *					Those sub tasks would be excluded if the owner is the other one
		 * @param taskList	The collection of ADO defects and/or user stories
		 * @param authToken	The token string to be sent to ADO for the authentication
		 */
		function reCalculateTaskSpentTime(taskList, authToken) {
			var promises = [];
			//var ownerEmailList = Object.keys(currentSettings.OwnerEmailMapping);
			taskList.forEach(function (task) {
				if (task.TaskLink !== "") {
					var deferred = $.Deferred();
					$http.get(adoRestApi.getApiUrlSubTask(task.TaskLink), { headers: { "Authorization": "Basic " + authToken } })
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
									otherTask.FakeTask = true;	// This is not a real ADO task
									return otherTask;
								});

								// Reformat the other owner tasks
								task.OtherOwnerTasks = Array.from(Object.values(mergedTasks));
							}

							deferred.resolve(task);
						},
							function (error) {
								//console.error(error.statusText);
								deferred.reject(error);
							});
					promises.push(deferred.promise());
				};
			});

			return promises;
		};

		return {
			getFeatureList: getFeatureList,

			getAdoTaskUsingWiql: function(parameters) {
				var apis = adoRestApi.getWitUrl(parameters);
				return getAdoTaskUsingWiql($http, apis.url, apis.wiql, parameters.Token);
			},

			reCalculateTaskSpentTime: reCalculateTaskSpentTime
		}
	}]);
});