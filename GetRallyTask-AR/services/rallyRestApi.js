"use strict";

define(["app"], function (app) {
	app.service("rallyRestApi", ["currentSettings", function (currentSettings) {
		var urlFeature = "https://rally1.rallydev.com/slm/webservice/v2.0/PortfolioItem/Feature?\
							query=(<QueryString>)\
							&order=FormattedID\
							&fetch=FormattedID,Name,Owner,Release,Project,StoryCount,PlanEstimateTotal,PercentDoneByStoryCount,PercentDoneByStoryPlanEstimate,Blocked,BlockedReason,Project\
							&pagesize=1999";
		
		var urlOpenDefectCRP2 = 'https://rally1.rallydev.com/slm/webservice/v2.0/defect?\
								query=((Release.Name = "Crossroads [Phase II]") And ( (ScheduleState != "Completed") And ( (ScheduleState != "Accepted") And (Tags.ObjectID != null) ) ) )\
								&order=FormattedID\
								&fetch=FormattedID,Name,Description,Owner,PlanEstimate,TaskEstimateTotal,Tasks,Iteration,Release,ScheduleState,State,Description,c_PLIEventCRNumber,Blocked,BlockedReason,Priority,DragAndDropRank,FlowStateChangedDate,Feature,Tags\
								&pagesize=1999';

		// <target> can be either 'hierarchicalrequirement' or 'defect'
		var urlOpenTask = 'https://rally1.rallydev.com/slm/webservice/v2.0/\
										<target>?\
										query=((Release.Name Contains "<release>") And ( (ScheduleState != "Completed") And (ScheduleState != "Accepted") ) )\
										&order=FormattedID\
										&fetch=FormattedID,Name,Description,Owner,PlanEstimate,TaskEstimateTotal,Tasks,Iteration,Release,ScheduleState\
											,State,Description,c_PLIEventCRNumber,Blocked,BlockedReason,Priority,DragAndDropRank,FlowStateChangedDate,Feature\
											,Tags,c_FoundInProduct,FixedInBuild\
										&pagesize=1999';

		var urlTaskSummary = 'https://rally1.rallydev.com/slm/webservice/v2.0/\
							<target>?\
							query=( (Iteration.Name = "Sprint <sprint>")\
									 And ((Release.Name Contains "<release>") Or (Project.Name Contains "<team>"))\
								  )\
							&order=Iteration,LastUpdateDate\
							&fetch=FormattedID,PlanEstimate,TaskEstimateTotal,Release,ScheduleState,State,Blocked\
							&pagesize=1999';

		var urlTask = 'https://rally1.rallydev.com/slm/webservice/v2.0/\
							<target>?\
							query=( ((Release.Name Contains "<release>") Or (Project.Name Contains "<team>"))\
									 And (<dateCondition> <ownerStateCondition>)\
								  )\
							&order=Iteration,LastUpdateDate\
							&fetch=FormattedID,Name,Description,Owner,PlanEstimate,TaskEstimateTotal,Tasks,Iteration,Release,ScheduleState,State,Description,Notes\
								,c_AcceptanceCriteria,c_RootCauseDescription,c_ResolutionReason,c_PLIEventCRNumber,Blocked,BlockedReason,Priority,DragAndDropRank\
								,FlowStateChangedDate,Feature,Requirement,c_FoundInProduct,FixedInBuild\
							&pagesize=1999';

		/**
		 * @name	getDateCondition
		 *
		 * @description	Gets date condition
		 *
		 * @param	sprint	The sprint number. 0 means get all sprint tasks; -1 means unscheduled tasks
		 *
		 * @returns	The date condition string used for Rally task query.
		 */
		function getDateCondition(sprint) {
			var dateCondition = "";
			switch (sprint) {
				case -1:
					dateCondition = " (Iteration = null) ";
					break;
				case 0:
					// Get all sprint tasks
					dateCondition = ' ((AcceptedDate >= "2021-01-01") OR (InProgressDate >= "2021-01-01")) ';
					break;
				default:	// is > 0
					// The sprint ImageSuite used if different with IV. 
					// e.g. IV sprint 75 means IS sprint 1
					dateCondition = ' ((Iteration.Name = "Sprint ' + sprint + '") OR (Iteration.Name = "Sprint ' + (sprint - 74) + '")) ';
			}

			return dateCondition;
		};

		function getUrlOpenDefectCRP2() {
			return urlOpenDefectCRP2.replace(/\t/g, "");
		};

		function getUrlOpenDefect() {
			return urlOpenTask.replace(/\t/g, "").replace(/<target>/g, "defect");
		};

		function getUrlOpenUs() {
			return urlOpenTask.replace(/\t/g, "").replace(/<target>/g, "hierarchicalrequirement");
		};

		function getUrlOpenDefectSwiftwater() {
			return urlOpenTask.replace(/\t/g, "")
								.replace(/<target>/g, "defect")
								.replace(/<release>/g, "Swiftwater");
		};

		function getUrlOpenUsSwiftwater() {
			return urlOpenTask.replace(/\t/g, "")
								.replace(/<release>/g, "Swiftwater")
								.replace(/<target>/g, "hierarchicalrequirement");
		}

		function getUrlOpenDefectValhalla() {
			return urlOpenTask.replace(/\t/g, "")
								.replace(/<target>/g, "defect")
								.replace(/<release>/g, "Valhalla");
		};

		function getUrlOpenUsValhalla() {
			return urlOpenTask.replace(/\t/g, "")
								.replace(/<release>/g, "Valhalla")
								.replace(/<target>/g, "hierarchicalrequirement");
		};

		function getUrlOpenDefectShangriLa() {
			return urlOpenTask.replace(/\t/g, "")
								.replace(/<target>/g, "defect")
								.replace(/<release>/g, "Shangri-La");
		};

		function getUrlOpenUsShangriLa() {
			return urlOpenTask.replace(/\t/g, "")
								.replace(/<release>/g, "Shangri-La")
								.replace(/<target>/g, "hierarchicalrequirement");
		};

		function getUrlOpenDefectMaelstrom() {
			return urlOpenTask.replace(/\t/g, "")
								.replace(/<target>/g, "defect")
								.replace(/<release>/g, "Maelstrom");
		};

		function getUrlOpenUsMaelstrom() {
			return urlOpenTask.replace(/\t/g, "")
								.replace(/<release>/g, "Maelstrom")
								.replace(/<target>/g, "hierarchicalrequirement");
		};

		function getUrlTaskSummary() {
			return urlTaskSummary.replace("<release>", currentSettings.Release)
								.replace("<team>", currentSettings.Team);
		};

		// <target> must be either 'defect' or 'hierarchicalrequirement', the blank space before and operator are MUST
		function getUrlTask() {
			return urlTask.replace("<release>", currentSettings.Release)
							.replace("<team>", currentSettings.Team);
		};

		// Add new object if new added a release, refer to "crossradsPhaseII", "valhalla" or "swiftwater" about how to...
		function getAllReleases() {
			return [
				// crossroadsPhaseII
				{
					Name: "Crossroads Phase II",
					Urls: [getUrlOpenDefectCRP2()],

					inScope: function(release) {
						return /\[Phase II]/i.test(release);
					},

					process: function(list) {
						// Remove the items that has no tag "1.7" or "CR Phase II"
						return list.filter(item => {
							if (!item.Tags || item.Count < 1 || !item.Tags._tagsNameArray) return false;
							var ret = false;
							_.forEach(item.Tags._tagsNameArray,
								function(tag) {
									if (/CR Phase II|1.7/i.test(tag.Name)) {
										ret = true;
										return;
									}
								});

							return ret;
						});
					}
				},
				// swiftwater
				{
					Name: "Swiftwater",
					Urls: [getUrlOpenDefectSwiftwater(), getUrlOpenUsSwiftwater()],

					inScope: function(release) {
						return /\Swiftwater/i.test(release);
					},

					process: function(list) {
						return list;
					}
				},
				// Valhalla
				{
					Name: "Valhalla",
					Urls: [getUrlOpenDefectValhalla(), getUrlOpenUsValhalla()],

					inScope: function(release) {
						return /\Valhalla/i.test(release);
					},

					process: function(list) {
						return list;
					}
				},
				// Sharngri-La
				{
					Name: "Shangri-La",
					Urls: [getUrlOpenDefectShangriLa(), getUrlOpenUsShangriLa()],

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
					Urls: [getUrlOpenDefectMaelstrom(), getUrlOpenUsMaelstrom()],

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

		return {
			// The id 88538884208ud means ImageView Software project
			// The id 278792303760ud means Software project in new workspace
			CurrentWorkspace: "278792303760ud",

			UrlFeature: urlFeature,
			UrlOpenDefectCRP2: getUrlOpenDefectCRP2(),
			UrlOpenDefect: getUrlOpenDefect(),
			UrlOpenUs: getUrlOpenUs(),
			UrlOpenDefectSwiftwater: getUrlOpenDefectSwiftwater(),
			UrlOpenUsSwiftwater: getUrlOpenUsSwiftwater(),
			UrlOpenDefectValhalla: getUrlOpenDefectValhalla(),
			UrlOpenUsValhalla: getUrlOpenUsValhalla(),
			UrlOpenDefectShangriLa: getUrlOpenDefectShangriLa(),
			UrlOpenUsShangriLa: getUrlOpenUsShangriLa(),
			UrlOpenDefectMaelstrom: getUrlOpenDefectMaelstrom(),
			UrlOpenUsMaelstrom: getUrlOpenUsMaelstrom(),
			UrlTaskSummary: getUrlTaskSummary(),
			UrlTask: getUrlTask(),

			/**
			 * @name			getApiUrlFeature
			 *
			 * @description	Gets the actual url for getting feature list from Rally
			 *
			 * @param release	The name of release which is used as a filter when querying feature from Rally
			 *
			 * @return		Url used for Ajax call for getting feature list from Rally 
			 */
			getApiUrlFeature: function (release) {
				var qry = "Release.Name Contains" + ((release !== "") ? ('"' + release + '"') : currentSettings.Release);
				var url = urlFeature.replace("<QueryString>", qry)
									.replace(/\t/g, "");
				return url;
			},

			/**
			 * @name			getApiUrlTask
			 *
			 * @description	Gets the actual url for getting defect and user story list from Rally with given parameters
			 *
			 * @return		Url used for Ajax call for getting defect and user story list from Rally 
			 */
			getApiUrlTask: function (parameters, target) {
				var ownerStateCondition = "";	//(!parameters.IgnoreScheduleState) ? '((ScheduleState = Accepted) OR (ScheduleState = Completed))' : '';

				if (parameters.Owner !== "") {
					if (ownerStateCondition !== "") {
						ownerStateCondition = "((Owner.Name = " + parameters.Owner + ") And " + ownerStateCondition + ")";
					} else {
						ownerStateCondition = "(Owner.Name = " + parameters.Owner + ")";
					}
				}

				var dateCondition = getDateCondition(parameters.Sprint);
				if (ownerStateCondition === "") {
					// Need to remove the one set of bracket for dateCondition
					if (dateCondition.indexOf("((") > 0) {
						dateCondition = dateCondition.replace("((", "(").replace("))", ")");
					} else if (dateCondition.indexOf("(") > 0) {
						dateCondition = dateCondition.replace("(", "").replace(")", "");
					}
				} else {
					// Need to add ' AND ' between the two conditions
					ownerStateCondition = " And " + ownerStateCondition;
				}

				var actualApiUrl = urlTask.replace("<target>", target)
											.replace("<ownerStateCondition>", ownerStateCondition)
											.replace("<dateCondition>", dateCondition)
											.replace("<release>", currentSettings.Release)
											.replace("<team>", currentSettings.Team)
											.replace(/\t/g, "");

				return actualApiUrl;
			},

			/**
			 * @name			getApiUrlTask
			 *
			 * @description	Gets the actual url for getting defect and user story list from Rally with given parameters
			 *
			 * @return		Url used for Ajax call for getting defect and user story list from Rally 
			 */
			getApiUrlSubTask: function (taskUrl) {
				//return taskUrl + "?query=(State = Completed) &fetch=Owner,TimeSpent,Actuals&pagesize=1999";
				return taskUrl + "?&fetch=FormattedID,Owner,Actuals,State,Title&pagesize=1999";
			},

			/**
			 * @name			getApiUrlFeature
			 *
			 * @description	Gets the actual url for getting the task summary of all releases
			 *
			 * @param sprint	The sprint number
			 * @param target	Defect or user story
			 *
			 * @return		Url used for Ajax call for getting task summary from Rally 
			 */
			getApiUrlTaskSummary: function (sprint, target) {
				var url = urlTaskSummary.replace("<sprint>", sprint)
										.replace("<target>", target)
										.replace("<release>", currentSettings.Release)
										.replace("<team>", currentSettings.Team)
										.replace(/\t/g, "");
				return url;
			},
			
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
				if (!release) { release = getRelease("Maelstrom") }

				return release;
			},
			
			getRelease: getReleaseEx,
		};
	}]);
});