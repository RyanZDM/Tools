"use strict";

define(["app"], function (app) {
	app.service("adoRestApi", ["currentSettings", function (currentSettings) {		
		var project = "software";
		var URL = "https://dev.azure.com/cshdevops/";
		var urlWiql = URL + "software/_apis/wit/wiql?api-version=6.0";
		var urlWiqlDetail = urlWiql.replace("wiql", "workitemsbatch");

		var templateWiqlTaskAndParent =
			"Select [System.Id],[System.State],[Source].[System.AssignedTo],[Microsoft.VSTS.Scheduling.OriginalEstimate],[Microsoft.VSTS.Scheduling.CompletedWork] \
																From workitemLinks Where \
																(\
																	AND [Source].[System.WorkItemType] IN ('User Story', 'Bug') \
																	{otherConditions}\
																) \
																AND (\
																	[System.Links.LinkType] = 'System.LinkTypes.Hierarchy-Forward'\
																) \
																AND (\
																	[Target].[System.TeamProject] = '{project}' AND [Target].[System.WorkItemType] = 'Task'\
																) \
																MODE (MustContain)\
															";
		
		var templateWiqlCalculateTaskSpentHours =
			"Select [System.Id],[System.State],[System.AssignedTo],[Microsoft.VSTS.Scheduling.OriginalEstimate],[Microsoft.VSTS.Scheduling.CompletedWork] \
																From workitems ";
																	//[System.WorkItemType] = 'Task' ";

		var wiqlCpeStat = "Select [System.Id],[System.State],[System.WorkItemType],[Custom.CSH_Notes],[Microsoft.VSTS.Common.Priority],[Custom.CSH_ProductFamily],[System.AreaPath]\
							From workitems Where\
							[System.WorkItemType] = 'User Story' \
							AND [System.AreaPath] = 'Software\\CPE' \
							AND [System.Title] CONTAINS '[' ";		// the title always contains [xxx] for an escalation issue us

		function formatQuery(url) {
			return url.replace(/\{project\}/g, project)
						.replace(/\t/g, "");
		}

		// Add new object if new added a release, refer to "Maelstrom" about how to...
		function getAllReleases() {
			return [
				// Jing-A
				{
					Name: "Jing-A",
					Parameters: { ReleaseContains: "Jing-A" },

					inScope: function(release) {
						return /\Jing/i.test(release);
					},

					process: function(list) {
						return list;
					}
				},
				// Maelstrom
				{
					Name: "Maelstrom",
					Parameters: { ReleaseContains: "Maelstrom" },

					inScope: function(release) {
						return /\Maelstrom/i.test(release);
					},

					process: function(list) {
						return list;
					}
				},
				{
					Name: "CPE",
					Parameters: { Teams: "CPE" },
					inScope: function(release) {
						return /\CPE:/i.test(release);
					},
					process: function(list) {
						return list;
					}
				}
			];
		};

		/**
		 * @name getReleaseEx
		 * @description Gets the release by name
		 * @param {string} name of release
		 */
		function getReleaseEx(name) {
			var lowerName = name.toLowerCase();
			var releases = getAllReleases();
			for (var index in releases) {
				if (releases[index].Name.toLowerCase() === lowerName) return releases[index];
			}

			return null;
		};

		/**
		 * Gets the URL by parameters for querying the ADO tasks
		 * @param {any} parameters	Query parameters
		 * @return The URL and WIQL string for a POST query
		 */
		function getWitUrl(parameters) {
			var selectClause = "Select [System.Id] From workitems Where ";
			
			var whereClause = generateWhereClause(parameters);

			var wiql = selectClause + whereClause;
			return { url:urlWiql, wiql: wiql };
		};
		
		function generateWhereClause(parameters, columnPrefix) {
			if (!columnPrefix) { columnPrefix = ""; }
			
			var conditions = [];
			if (parameters.States) {
				var states = [].concat(parameters.States).join("','");
				if (states.length !== "") {
					var conditionState = "<prefix>[System.State] IN ('<states>')".replace("<prefix>", columnPrefix).replace("<states>", states);
					conditions.push(conditionState);
				}
			}

			if (parameters.WorkItemType && parameters.WorkItemType.length > 0) {
				var types = [].concat(parameters.WorkItemType).join("','");
				var conditionWit = "<prefix>[System.WorkItemType] IN ('<types>')".replace("<prefix>", columnPrefix).replace("<types>", types);
				conditions.push(conditionWit);
			} else {
				conditions.push("<prefix>[System.WorkItemType] IN ('User Story', 'Bug')".replace("<prefix>", columnPrefix));	// default value
			}

			if (parameters.Owners) {
				var owners = [].concat(parameters.Owners).join("','");
				if (owners !== "") {
					var conditionOwner = "<prefix>[System.AssignedTo] IN ('<owners>')".replace("<prefix>", columnPrefix).replace("<owners>", owners);
					conditions.push(conditionOwner);
				}
			}

			if (parameters.Sprint) {
				var conditionIteration = "<prefix>[System.IterationPath] = 'Software\\Sprint <sprint>'".replace("<prefix>", columnPrefix).replace("<sprint>", parameters.Sprint);
				conditions.push(conditionIteration);
			}

			if (parameters.Teams) {
				var teams = [].concat(parameters.Teams);
				if (teams.length > 0) {
					teams = teams.map(function (team) {
						if (team.toLowerCase() === "cpe") {
							return "Software\\CPE";
						} else {
							return "Software\\Console\\Team " + team;
						}
					});
					var teamString = teams.join("','");
					var conditionArea = "<prefix>[System.AreaPath] In ('<team>') ".replace("<prefix>", columnPrefix).replace("<team>", teamString);
					conditions.push(conditionArea);
				}
			}

			if (parameters.Release && parameters.Release !== "") {
				var conditionRelease = "<prefix>[Custom.CSH_Release] = '<release>'".replace("<prefix>", columnPrefix).replace(parameters.Release);
				conditions.push(conditionRelease);
			} else if (parameters.ReleaseContains && parameters.ReleaseContains !== "") {
				var conditionReleaseEx = "<prefix>[Custom.CSH_Release] Contains '<release>'".replace("<prefix>", columnPrefix).replace("<release>", parameters.ReleaseContains);
				conditions.push(conditionReleaseEx);
			}
			
			return conditions.join(" AND ");
		};

		function getTaskAndParentUrl(parameters) {
			var wiql = formatQuery(templateWiqlTaskAndParent);

			var whereClause = generateWhereClause(parameters, "[Source].");
			if (whereClause.length > 0) {
				whereClause = " AND " + whereClause;
			}
			wiql = wiql.replace("{otherConditions}", whereClause);

			return wiql;
		}

		function getTaskSpentTimeUrl(parameters) {
			var wiql = formatQuery(templateWiqlCalculateTaskSpentHours);

			var whereClause = generateWhereClause(parameters);
			if (whereClause.length > 0) {
				if (wiql.toLowerCase().indexOf("where") === -1) {
					wiql = wiql + " WHERE " + whereClause;
				} else {
					wiql = wiql + " AND " + whereClause;
				}
			}
			return wiql;
		}

		return {
			MaxRecordsEveryQuery: 200,

			// The id 88538884208ud means ImageView Software project
			// The id 278792303760ud means Software project in new workspace
			CurrentWorkspace: "278792303760ud",

			// The HTTP URL of a ADO task (Bug, US, Feature, Sub task)
			WitLink: formatQuery("https://dev.azure.com/cshdevops/{project}/_workitems/edit/"),

			// POST: Gets work item list via WIQL (only return id and url of work item)
			TemplateWiqlQuery: formatQuery(urlWiql),

			// POST: Gets work item list via IDs (Maximum 200). Call this after called <templateWiqlUrl>
			TemplateWitBatchQuery: formatQuery(urlWiqlDetail),

			// GET: Gets a bunche of work items via IDs. Call this after called <templateWiqlUrl>
			TemplateWitsQuery: formatQuery(URL + "{project}/_apis/wit/workitems?ids={ids}&fields={fields}&api-version=6.0"),

			// GET: Gets detail of a bug, user story or feature
			TemplateWitQuery: formatQuery(URL + "_apis/wit/workitems/{id}"),

			// WIQL for querying feature
			TemplateWiqlFeatureList: formatQuery(
				"SELECT [System.Id] FROM workitems WHERE [System.WorkItemType] = 'Feature'"),

			TemplateWiqlCalculateTaskSpentHours: formatQuery(templateWiqlCalculateTaskSpentHours),
			
			WiqlCpeStatistics: formatQuery(wiqlCpeStat),

			/**
			 * @name			getWitUrl
			 *
			 * @description	Gets the actual url for getting work item (task, bug, us, feature) list from ADO with given parameters{
			 *
			 * @return		Url used for Ajax call for getting work item list from ADO 
			 */
			getWitUrl: getWitUrl,
			
			/**
			 * @name		getTaskSpentTimeUrl
			 * @description Gets the url for getting all sub tasks and the spent hours
			 */
			getTaskSpentTimeUrl: getTaskSpentTimeUrl,

			/**
			 * @name getCurrentRelease
			 * @description Gets the current release
			 */
			getCurrentRelease: function() {
				var release = getReleaseEx(currentSettings.Release);
				if (!release) { release = getReleaseEx("Maelstrom") }

				return release;
			},

			getSecondRelease: function() {
				var release = getReleaseEx(currentSettings.SecondRelease);
				if (!release) { release = getReleaseEx("CPE") }

				return release;
			},
			
			getRelease: getReleaseEx
		};
	}]);
});