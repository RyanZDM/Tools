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
		 * @param {string} url			url to the REST API of ADO
		 * @param {string} wiql			WIQL string
		 * @param {string} authToken	The token string to be sent to ADO for the authentication
		 */
		function getAdoTaskUsingWiql(url, wiql, authToken) {
			return queryUsingWiql(url, wiql, authToken, "WIT", null);
		};
		
		function getCpeStatistics(parameters) {
			return queryUsingWiql(adoRestApi.TemplateWiqlQuery, adoRestApi.WiqlCpeStatistics, parameters.Token, "WIT", []);
		}
		
		/**
		 * @name getFeatureList
		 * @description		Analyze the ADO feature list
		 * @return			The ADO feature collection
		 */
		function getFeatureList(authToken) {
			var url = adoRestApi.TemplateWiqlQuery;
			var wiql = adoRestApi.TemplateWiqlFeatureList;

			return queryUsingWiql(url, wiql, authToken, "Feature", ["System.Title"]);
		};

		function calculateTaskSpentTime(parameters, authToken) {
			var url = adoRestApi.TemplateWiqlQuery;
			var wiql =  adoRestApi.getTaskSpentTimeUrl(parameters);
			var returnFields = ["[System.Id]"
								,"[System.AssignedTo]"
								,"[System.State]"
								,"[System.AreaPath]"
								,"[System.IterationPath]"
								,"[Microsoft.VSTS.Scheduling.OriginalEstimate]"
								,"[Microsoft.VSTS.Scheduling.CompletedWork]"];

			var deferred = $.Deferred();
			queryUsingWiql(url, wiql, authToken, "WIT", /*returnFields*/ null).then(function(result) {
					deferred.resolve(result);
					//var tasks = _.pluck
				},
				function(error) {
					deferred.reject(error);
				});

			return deferred.promise();
		}
		
		/**
		 * @name  Gets the new parameters for getting detail info of work item. Call by other methods internally
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
		 * name queryUsingWiql			Call by other methods internally
		 * @param {string} url			url to the REST API of ADO
		 * @param {string} wiql			WIQL string
		 * @param {string} authToken	The token string to be sent to ADO for the authentication
		 * @param {string} returnType	The type of return list, "Feature" or "WIT" (Bug/US/Task)
		 * @param {string or Array<string>} returnFields	[] means specify by SELECT clause, null means return all fields
		 */
		function queryUsingWiql(url, wiql, authToken, returnType, returnFields) {
			var deferred = $.Deferred();
			jQueryPost(url, authToken, JSON.stringify({ "query": wiql }))
				.then(function (result) {
						if (result.queryResultType && result.queryResultType === "workItem") {
							// This is a "flat" query
							// There is a limitation that ADO query returns max 200 records one time
							if (returnFields && returnFields.length === 0) {
								returnFields = _.pluck(result.columns, "referenceName");
							}
							var newParams = getParametersForWitQuery(url, result.workItems, returnFields);
							if (newParams.length < 1) {
								deferred.reject("Error occurred while getting parameters for WIT query.");
								return;
							}

							var promises = [];
							newParams.forEach(function(qry) {
								promises.push(jQueryPost(qry.url, authToken, JSON.stringify(qry.data)));
							});

							Promise.all(promises)
								.then(function(list) {
									list = _.flatten(_.pluck(list, "value"));
									deferred.resolve(getList(adoRestApi, list, returnType));
								})
								.catch(function(err) {
									deferred.reject(err);
								});
						} else if (result.queryResultType && result.queryResultType === "workItemLink") {
							// This is a "Work items and direct links" query
							// Format:
							// For top level (US or bug), 
							//		rel: null
							//		source: null
							//		target:
							//			id: <id of itself>
							//			url: <http url ti itself>
							// For second level (task)
							//			rel: "System.LinkTypes.Hierarchy-Forward"
							//			source: refer to parent (id, url)
							//			target: refer to the sub task (id, url)
							deferred.resolve(result.workItemRelations);
						}
					},
					function (error) {
						deferred.reject(error);
					});

			return deferred.promise();
		}

		/**
		 * @name getList
		 * @description		Analyze the JSON object and return the feature or work item list against on the return type. Call by other methods internally
		 * @param restApi	The restApi object
		 * @param itemArray	The json object contains records get from ADO
		 * @param returnType	"Feature" or "WIT"
		 * @return			The ADO record collection
		 */
		function getList(resetApi, itemArray, returnType) {
			returnType = returnType.toLowerCase();
			
			if (returnType === "wit") return getWorkItems(resetApi, itemArray);
			if (returnType === "feature") return getFeatures(resetApi, itemArray);

			return [];
		}

		/**
		 * @name getFeatures
		 * @description		Analyze the JSON object and return the feature list against on the target type. Call by other methods internally
		 * @param restApi	The restApi object
		 * @param itemArray	The json object contains feature records get from ADO
		 * @r
		 */
		function getFeatures(restApi, itemArray) {
			if (!itemArray) return [];

			var featureList = [];
			itemArray.forEach(function(feature) {
				featureList.push(new adoFeature(feature, adoRestApi.WitLink));
			});

			return featureList;
		}

		/**
		 * @name getWorkItems
		 * @description		Analyze the JSON object and return the work item list against on the target type. Call by other methods internally
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

		return {
			getFeatureList: getFeatureList,

			getAdoTaskUsingWiql: function(parameters) {
				var apis = adoRestApi.getWitUrl(parameters);
				return getAdoTaskUsingWiql(apis.url, apis.wiql, parameters.Token);
			},

			getCpeStatistics: getCpeStatistics,
			
			calculateTaskSpentTime: calculateTaskSpentTime
		}
	}]);
}); 