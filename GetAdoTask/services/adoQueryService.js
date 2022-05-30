"use strict";

define(["jquery", "underscore", "moment", "app", "moment-business-days"], function ($, _, moment, app) {
	/**
	 * @name adoQueryService
	 * @description - service for querying info from ADO
	 */
	app.service("adoQueryService", [
		"$http",
		"$q",
		"adoRestApi",
		"utility",
		"modalityDefinition",
		"catalogDefinition",

		function ($http, q, adoRestApi, utility, modalityDefinition, catalogDefinition) {
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
		* @param {string} authToken	The token string to be sent to ADO for the authentication
 		 * @param {string} url			url to the REST API of ADO
		 * @param {string} wiql			WIQL string
		 */
		function getAdoTaskUsingWiql(authToken, url, wiql) {
			return queryUsingWiql(authToken, url, wiql, "WIT", null);
		};
		
		/**
		 * @name getCpeStatistics
		 * @description Gets all CPE escalation issues (has keyword "[" in title)
		 * @param {any} parameters
		 * @return {Array}	CPE user story list
		 */
		function getCpeStatistics(parameters) {
			return queryUsingWiql(parameters.Token, adoRestApi.TemplateWiqlQuery, adoRestApi.WiqlCpeStatistics, "WIT", []);
		}
		
		/**
		 * @name getFeatureList
		 * @description		Analyze the ADO feature list
		 * @return			The ADO feature collection
		 */
		function getFeatureList(authToken) {
			var url = adoRestApi.TemplateWiqlQuery;
			var wiql = adoRestApi.TemplateWiqlFeatureList;

			return queryUsingWiql(authToken, url, wiql, "Feature", ["System.Title"]);
		};

		/**
		 * @name calculateTaskSpentTime
		 * @description Sumarize the "OriginalEstimate" and "CompletedWork" by sub tasks by condition
		 * @param {any} parameters
		 * @param {any} authToken
		 */
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
			queryUsingWiql(authToken, url, wiql, "WIT", /*returnFields*/ null).then(function(result) {
					deferred.resolve(result);
					//var tasks = _.pluck
				},
				function(error) {
					deferred.reject(error);
				});

			return deferred.promise();
		}
		
		/**
		 * @name getTaskDetailInfo
		 * @description Gets the detail info of work items
		 * @param {string}	URI
		 * @param {Array<int/string>} idList	The list of work item ID
		 * @param {null or Array<string>} returnFields	The name list of field to be returned
		 * @param {string} authToken	The token string to be sent to ADO for the authentication
		 */
		function getTaskDetailInfo(url, idList, returnFields, authToken) {
			var deferred = $.Deferred();

			var newParams = getParametersForWitQuery(idList, returnFields);
			if (newParams.length < 1) {
				deferred.reject("Error occurred while getting parameters for WIT query.");
				return deferred.promise();
			}

			var promises = [];
			newParams.forEach(function(qry) {
				promises.push(jQueryPost(url, authToken, JSON.stringify(qry)));
			});

			Promise.all(promises)
				.then(function(list) {
					list = _.flatten(_.pluck(list, "value"));
					deferred.resolve(list);
				})
				.catch(function(err) {
					deferred.reject(getErrorMessage(err));
				});

			return deferred.promise();
		}

		/**
		 * @name  Gets the new parameters for getting detail info of work item. Call by other methods internally
		 * @param {string} url
		 * @param {Array<int>} idList
		 * @param {null or Array<string>} returnFields
		 */
		function getParametersForWitQuery(idList, returnFields) {
			var queries = [];

			// Split to multiple calls since return max 200 records for each query
			var queryCount = Math.ceil(idList.length / adoRestApi.MaxRecordsEveryQuery);
			for (var i = 0; i < queryCount; i++) {
				var start = i * adoRestApi.MaxRecordsEveryQuery;
				var end = start + adoRestApi.MaxRecordsEveryQuery;
				var newQueryData = { ids: idList.slice(start, end) };
				if (returnFields && returnFields.length > 0) {
					newQueryData.fields = returnFields;
				} else {
					newQueryData["$expand"] = "relations";
				}
				queries.push(newQueryData);
			}

			return queries;
		};

		/**
		 * name queryUsingWiql			Call by other methods internally
		 * @param {string} authToken	The token string to be sent to ADO for the authentication
		 * @param {string} url			url to the REST API of ADO
		 * @param {string} wiql			WIQL string
		 * @param {string} returnType	The type of return list, "Feature" or "WIT" (Bug/US/Task)
		 * @param {string or Array<string>} returnFields	[] means specify by SELECT clause, null means return all fields
		 */
		function queryUsingWiql(authToken, url, wiql, returnType, returnFields, queryType) {
			var deferred = $.Deferred();
			jQueryPost(url, authToken, JSON.stringify({ "query": wiql }))
				.then(function (result) {
					if (result.queryResultType && result.queryResultType === "workItem") {
						// This is a "flat" query
						// There is a limitation that ADO query returns max 200 records one time
						var newUrl = url.replace("wiql", "workitemsbatch");
						var witIds = _.pluck(result.workItems, "id");

						if (returnFields) {
							if (returnFields.length === 0) {
								returnFields = _.pluck(result.columns, "referenceName");
							}

							// Add filed "System.Parent" since need to know its Parent
							returnFields.push("System.Parent");
						}

						getTaskDetailInfo(newUrl, witIds, returnFields, authToken).then(function (list) {
							deferred.resolve(getList(adoRestApi, list, returnType));
						})
							.catch(function (err) {
								deferred.reject(err);
							});
					} else if (result.queryResultType && result.queryResultType === "workItemLink") {
						// This is a "Work items and direct links" query, gets date from [workItemRelations] node
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
						deferred.reject(getErrorMessage(error));
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
		function getList(restApi, itemArray, returnType) {
			if (!returnType || returnType === "") {
				var list = _.pluck(itemArray, "fields")
				var witList = [];

				var fieldMapping = {};
				for (var propertyName in list[0]) {
					var newProp = propertyName.split(".").pop();
					fieldMapping[propertyName] = newProp;
				}

				list.forEach(function (item) {
					var wit = {};
					for (var propertyName in item) {
						var newProp = propertyName.split(".").pop();
						wit[newProp] = item[propertyName];
					}

					witList.push(wit);
				});

				return witList;
			}

			returnType = returnType.toLowerCase();

			var tools = {
				restApi: restApi
				, moment: moment
				, utility: utility
				, modalityDefinition: modalityDefinition
				, catalogDefinition: catalogDefinition
			};
			if (returnType === "wit") return getWorkItems(itemArray, tools);
			if (returnType === "feature") return getFeatures(restApi, itemArray);

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
		 * @param itemArray	The json object contains records get from ADO
		 * @param tools	The restApi object and moment
 		 * @return			The ADO record collection
		 */
		function getWorkItems(itemArray, tools) {
			if (!itemArray || itemArray.length === 0) return [];

			var today = moment().format("YYYYMMDD");
			var witList = [];
			itemArray.forEach(function(item) {
				var wit = new adoWorkItem(item, tools);

				wit.WasChangedToday = false;
				if (wit.StateChangeDate) {
					var changeDate = moment(wit.StateChangeDate).format("YYYYMMDD");
					if (changeDate === today) { wit.WasChangedToday = true; }
				}

				witList[witList.length] = wit;
			});

			return witList;
		};

		function getWiqlOfNamedQuery(queryId, token) {
			var url = adoRestApi.TemplateDefineOfNamedQuery.replace("{queryid}", queryId);
			return jQueryGet(url, token);
		}

		/**
		* @name	getErrorMessage
		* @description	Get error messager
		* @param	error	The error object.
		*/
		function getErrorMessage(error) {
			if (typeof error === "string") return error;

			var errorMsg = "";

			if (error.status === 401) {
				errorMsg = "incorrect user name or password";
			} else {
				if (error.responseText && error.responseText !== "") {
					errorMsg = error.responseText;
				} else if (error.statusText !== "") {
					errorMsg = error.statusText;
				} else {
					errorMsg = error.toString();
				}
			}

			return errorMsg;
		};

		return {
			getFeatureList: getFeatureList,

			pureWiqlQuery: function(parameters) {
				return queryUsingWiql(parameters.Token,
					adoRestApi.TemplateWiqlQuery,
					parameters.Wiql,
					parameters.ReturnType,
					parameters.ReturnFields);
			},

			getAdoTaskUsingWiql: function(parameters) {
				var apis = adoRestApi.getWitUrl(parameters);
				return getAdoTaskUsingWiql(parameters.Token, apis.url, apis.wiql);
			},

			getWiqlOfNameqdQuery: function (parameters) {
				return getWiqlOfNamedQuery(parameters.QueryId, parameters.Token);
			},

			getTaskDetailInfo: getTaskDetailInfo,

			getCpeStatistics: getCpeStatistics,
			
			calculateTaskSpentTime: calculateTaskSpentTime,

			getErrorMessage: getErrorMessage
		}
	}]);
}); 