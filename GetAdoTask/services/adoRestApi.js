"use strict";

define(["app"], function (app) {
	app.service("adoRestApi", ["currentSettings", function (currentSettings) {
		var organization = "cshdevops";
		var project = "software";
		
		function formatQuery(url) {
			return url.replace("{org}", organization)
						.replace("{project}", project);
		}

		// Add new object if new added a release, refer to "Maelstrom" about how to...
		function getAllReleases() {
			return [
				// Sharngri-La
				{
					Name: "Shangri-La",
					Parameters: { Release: "Shangri-La (ImageView 1.10)" },

					inScope: function(release) {
						return /\Shangri/i.test(release);
					},

					process: function(list) {
						return list;
					}
				},
				// Maelstrom
				{
					Name: "Maelstrom",
					Parameters: { Release: "Maelstrom (ImageView 1.11)" },

					inScope: function(release) {
						return /\Maelstrom/i.test(release);
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

		function getWitUrl(parameters) {
			var selectClause = "Select [System.Id] From workitems Where ";
			var conditions = [];

			if (parameters.States) {
				var states = [].concat(parameters.States).join("','");
				if (states.length !== "") {
					var conditionState = "[System.State] IN ('<states>')".replace("<states>", states);
					conditions.push(conditionState);
				}
			}

			if (parameters.WitType && parameters.WitType.length > 0) {
				var types = [].concat(parameters.WitType).join("','");
				var conditionWit = "[System.WorkItemType] IN ('<types>')".replace("<types>", types);
				conditions.push(conditionWit);
			} else {
				conditions.push("[System.WorkItemType] IN ('User Story', 'Bug')");	// default value
			}

			if (parameters.owners) {
				var owners = [].concat(parameters.owners).join("','");
				if (owners !== "") {
					var conditionOwner = "[System.AssignedTo] IN ('<owners>')".replace("<owners>", owners);
					conditions.push(conditionOwner);
				}
			}

			if (parameters.Sprint) {
				var iteration = "Software\Sprint " + parameters.Sprint;
				var conditionIteration = "[System.IterationPath] = 'Software\\Sprint <sprint>'".replace("<sprint>", parameters.Sprint);
				conditions.push(conditionIteration);
			}

			if (parameters.Team && parameters.Team !== "") {
				var conditionTeam = "[System.AreaPath] = '<team>'".replace("<team>", parameters.Team);
				conditions.push(conditionTeam);
			}

			if (parameters.Release && parameters.relatedAddress !== "") {
				var conditionRelease = "[Custom.CSH_Release] = '<release>'".replace(parameters.Release);
				conditions.push(conditionRelease);
			}

			var wiql = selectClause + conditions.join(" AND ");
			return { url:formatQuery("https://dev.azure.com/{org}/{project}/_apis/wit/wiql?api-version=6.0"), wiql: wiql };
		};

		return {
			MaxRecordsEveryQuery: 200,

			// The id 88538884208ud means ImageView Software project
			// The id 278792303760ud means Software project in new workspace
			CurrentWorkspace: "278792303760ud",


			WitLink: formatQuery("https://dev.azure.com/{org}/{project}/_workitems/edit/"),

			// POST: Gets work item list via WIQL (only return id and url of work item)
			TemplateWiqlQuery: formatQuery("https://dev.azure.com/{org}/{project}/_apis/wit/wiql?api-version=6.0"),

			// POST: Gets work item list via IDs (Maximum 200). Call this after called <templateWiqlUrl>
			TemplateWitBatchQuery: formatQuery("https://dev.azure.com/{org}/{project}/_apis/wit/workitemsbatch?api-version=6.0"),

			// GET: Gets a bunche of work items via IDs. Call this after called <templateWiqlUrl>
			TemplateWitsQuery: formatQuery("https://dev.azure.com/{org}/{project}/_apis/wit/workitems?ids={ids}&fields={fields}&api-version=6.0"),

			// GET: Gets detail of a bug, user story or feature
			TemplateWitQuery: formatQuery("https://dev.azure.com/{org}/_apis/wit/workitems/{id}"),

			TemplateWiqlFeatureList: formatQuery("SELECT [System.Id] FROM workitems WHERE [System.WorkItemType] = 'Feature'"),


			/**
			 * @name			getWitUrl
			 *
			 * @description	Gets the actual url for getting work item (task, bug, us, feature) list from ADO with given parameters
			 *
			 * @return		Url used for Ajax call for getting work item list from ADO 
			 */
			getWitUrl: getWitUrl,
			
			/**
			 * @name getCurrentRelease
			 * @description Gets the current release
			 */
			getCurrentRelease: function() {
				var release = getReleaseEx(currentSettings.Release);
				if (!release) { release = getRelease("Maelstrom") }

				return release;
			},

			getSecondRelease: function() {
				var release = getReleaseEx(currentSettings.SecondRelease);
				if (!release) { release = getRelease("Shangri-La") }

				return release;
			},
			
			getRelease: getReleaseEx
		};
	}]);
});