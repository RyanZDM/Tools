'use strict';

define(['app'], function (app) {
	app.service('rallyRestApi', function () {
		var urlFeature = 'https://rally1.rallydev.com/slm/webservice/v2.0/PortfolioItem/Feature?\
							query=(<QueryString>)\
							&order=FormattedID\
							&fetch=FormattedID,Name,Owner,Release,Project,StoryCount,PlanEstimateTotal,PercentDoneByStoryCount,PercentDoneByStoryPlanEstimate,Blocked,BlockedReason\
							&pagesize=1999';
		var urlTaskSummary = 'https://rally1.rallydev.com/slm/webservice/v2.0/\
							<target>?\
							query=((Iteration.Name = "Sprint <sprint>")\
									 And ((Release.Name Contains "1.4") Or ((Release.Name Contains "OTC") Or (Project.Name = "Team Taiji"))))\
							&order=Iteration,LastUpdateDate\
							&fetch=FormattedID,PlanEstimate,TaskEstimateTotal,Release,ScheduleState,State,Blocked\
							&pagesize=1999';

		var urlTask = 'https://rally1.rallydev.com/slm/webservice/v2.0/\
							<target>?\
							query=( ((Release.Name Contains "1.4") Or (Release.Name Contains "OTC"))\
									 And (<dateCondition> <ownerStateCondition>)\
								  )\
							&order=Iteration,LastUpdateDate\
							&fetch=FormattedID,Name,Owner,PlanEstimate,TaskEstimateTotal,Tasks,Iteration,Release,ScheduleState,State,Description,Notes,c_AcceptanceCriteria,c_RootCauseDescription,c_PLIEventCRNumber,Blocked,BlockedReason,Priority,DragAndDropRank\
							&pagesize=1999';
		var ownerEmailMapping = {
			"Ryan Zhang": "dameng.zhang@carestream.com",
			"Joe Z": "joe.zhang@carestream.com",
			"Peter Y": "qinqiang.yan@carestream.com",
			"Mark Gu": "jiandong.gu@carestream.com",
			"Qi Wang": "qi.wang@carestream.com",
			"Gary Liu": "gary.liu@carestream.com",
			"Lyman M": "liang.ma@carestream.com",
			"Jun Sun": "jun.sun@carestream.com",
			"Zhe S": "zhe.sun@carestream.com",
			"Jiaxin Yao": "yao.jiaxin@carestream.com",
			"Xianjun Z": "xianjun.zhan@carestream.com",
			"Iris J": "lili.jiang@carestream.com",
			"Forrest Feng": "changzheng.feng@carestream.com",
			"Cheng Luo": "cheng.luo@carestream.com",
			"Benny Liu": "lei.liu@carestream.com",
			"Dean Peng": "dean.peng@carestream.com",
			"DongXiao L": "dongxiao.liu@carestream.com",
			"Taylor Tao": "lian.tao@carestream.com",
			"Song Zhao": "song.zhao@carestream.com",
			"Terry Zhou": "jun.zhou@carestream.com",
			"Yijiong S": "yijiong.shi@carestream.com"
		};

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
			var dateCondition = '';
			switch (sprint) {
				case -1:
					dateCondition = ' (Iteration = null) ';
					break;
				case 0:
					// Get all sprint tasks
					dateCondition = ' ((AcceptedDate >= "2019-01-01") OR (InProgressDate >= "2019-01-01")) '
					break;
				default:	// is > 0
					dateCondition = ' (Iteration.Name = "Sprint ' + sprint + '") ';
			}

			return dateCondition;
		};

		return {
			// The id 88538884208ud means ImageView Software project
			// The id 278792303760ud means Software project in new workspace
			CurrentWorkspace: '278792303760ud',

			OwnerEmailMapping: ownerEmailMapping,

			UrlFeature: urlFeature,

			UrlTaskSummary: urlTaskSummary,

			// <target> must be either 'defect' or 'hierarchicalrequirement', the blank spack befor and operator are MUST
			UrlTask: urlTask,

			UrlWarnings: {
				NoRelease: {
					Desc: 'USER STORIES OR DEFECTS IN A SPRINT THAT HAVE NO RELEASE (SHOULD HAVE A RELEASE)',
					Urls: ['https://rally1.rallydev.com/slm/webservice/v2.0/hierarchicalrequirement?query=((Iteration != null) AND (Release = null)) &order=Owner&fetch=FormattedID,Name,Owner,Iteration',
							'https://rally1.rallydev.com/slm/webservice/v2.0/defect?query=((Iteration != null) AND (Release = null)) &order=Owner&fetch=FormattedID,Name,Owner,Iteration']
				},

				NoEstimation: {
					Desc: "USER STORIES OR DEFECTS IN A SPRINT THAT DON'T HAVE A PLAN ESTIMATE (SHOULD HAVE A PLAN ESTIMATE)",
					Urls: ['https://rally1.rallydev.com/slm/webservice/v2.0/hierarchicalrequirement?query=((((Release.Name contains "1.4") AND (ScheduleState > "Defined")) AND (PlanEstimate = null)) AND (Iteration != null))&order=Owner&fetch=FormattedID,Name,Owner,Iteration',
							'https://rally1.rallydev.com/slm/webservice/v2.0/defect?query=((((Release.Name contains "1.4") AND (ScheduleState > "Defined")) AND (PlanEstimate = null)) AND (Iteration != null))&order=Owner&fetch=FormattedID,Name,Owner,Iteration']
				},

				NoFeature: {
					Desc: 'USER STORIES THAT ARE NOT ASSOCIATED WITH A FEATURE (ALL USER STORIES SHOULD BE UNDER A FEATURE)',
					Urls: ['https://rally1.rallydev.com/slm/webservice/v2.0/hierarchicalrequirement?query=(((Release.Name contains "1.4") AND (Feature = null)) AND (Iteration != null))&order=Owner&fetch=FormattedID,Name,Owner,Iteration']
				},

				NoTask: {
					Desc: "USER STORIES IN A SPRINT THAT DON'T HAVE ANY TASK ESTIMATES (OR HAVE NO TASK CREATED)",
					Urls: ['https://rally1.rallydev.com/slm/webservice/v2.0/hierarchicalrequirement?query=((((Release.Name contains "1.4") AND (ScheduleState > "Defined")) AND (Iteration != null)) AND (TaskEstimateTotal = 0))&order=Owner&fetch=FormattedID,Name,Owner,Iteration',
							'https://rally1.rallydev.com/slm/webservice/v2.0/defect?query=((((Release.Name contains "1.4") AND (ScheduleState > "Defined")) AND (Iteration != null)) AND (TaskEstimateTotal = 0))&order=Owner&fetch=FormattedID,Name,Owner,Iteration']
				},

				NoAC: {
					Desc: 'COMPLETED OR ACCEPTED USER STORIES WITH NO SPECIFIED ACCEPTANCE CRITERIA (ALL USER STORIES SHOULD HAVE ACCEPTANCE CRITERIA BEFORE THEY ARE ACCEPTED BY EET)',
					Urls: ['https://rally1.rallydev.com/slm/webservice/v2.0/hierarchicalrequirement?query=(((Release.Name contains "1.4") AND (ScheduleState >= "Completed")) AND (c_AcceptanceCriteria = null))&order=Owner&fetch=FormattedID,Name,Owner,Iteration']
				},

				NoBlockReason: {
					Desc: 'TASKS THAT ARE BLOCKED WITHOUT A BLOCKED REASON',
					Urls: ['https://rally1.rallydev.com/slm/webservice/v2.0/hierarchicalrequirement?query=(((Release.Name contains "1.4") AND (Blocked = true)) AND (BlockedReason = null))&order=Owner&fetch=FormattedID,Name,Owner,Iteration',
							'https://rally1.rallydev.com/slm/webservice/v2.0/defect?query=(((Release.Name contains "1.4") AND (Blocked = true)) AND (BlockedReason = null))&order=Owner&fetch=FormattedID,Name,Owner,Iteration']
				},

				// Check the Actuals hours start from sprint 44 (2019-06-10)
				NoTimeSpent: {
					Desc: 'TASKS THAT ARE IN PROCESS OR COMPLETED, BUT THERE IS NO ACTUALS TIME SPECIFIED (UPDATE ACTUALS HOURS IN TASK)',
					Urls: ['https://rally1.rallydev.com/slm/webservice/v2.0/hierarchicalrequirement?query=(((((Release.Name contains "1.4") AND (ScheduleState >= "Completed")) AND (TaskActualTotal = 0)) AND (InProgressDate >= "2019-06-10")) AND (Iteration != null))&order=Owner&fetch=FormattedID,Name,Owner,Iteration',
							'https://rally1.rallydev.com/slm/webservice/v2.0/defect?query=(((((Release.Name contains "1.4") AND (ScheduleState >= "Completed")) AND (TaskActualTotal = 0)) AND (InProgressDate >= "2019-06-10")) AND (Iteration != null))&order=Owner&fetch=FormattedID,Name,Owner,Iteration']
				}
			},

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
				var qry = (release !== '') ? 'Release.Name Contains "' + release + '"'
											: 'Release.Name Contains "1.4"';
				var url = urlFeature.replace('<QueryString>', qry)
									.replace(/\t/g, '');
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
				var ownerStateCondition = (!parameters.IgnoreScheduleState) ? '((ScheduleState = Accepted) OR (ScheduleState = Completed))' : '';

				if (parameters.Owner !== '') {
					if (ownerStateCondition !== '') {
						ownerStateCondition = '((Owner.Name = ' + parameters.Owner + ') And ' + ownerStateCondition + ')';
					} else {
						ownerStateCondition = '(Owner.Name = ' + parameters.Owner + ')';
					}
				}

				var dateConditation = getDateCondition(parameters.Sprint);
				if (ownerStateCondition === '') {
					// Need to remove the one set of bracket for dateConditaion
					if (dateConditation.indexOf('((') > 0) {
						dateConditation = dateConditation.replace('((', '(').replace('))', ')');
					} else if (dateConditation.indexOf('(') > 0) {
						dateConditation = dateConditation.replace('(', '').replace(')', '');
					}
				} else {
					// Need to add ' AND ' between the two conditions
					ownerStateCondition = ' And ' + ownerStateCondition;
				}

				var actualApiUrl = urlTask.replace('<target>', target)
											.replace('<ownerStateCondition>', ownerStateCondition)
											.replace('<dateCondition>', dateConditation)
											.replace(/\t/g, '');

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
				return taskUrl + "?&fetch=Owner,Actuals&pagesize=1999";
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
				var url = urlTaskSummary.replace('<sprint>', sprint)
										.replace('<target>', target)
										.replace(/\t/g, '');
				return url;
			}
		};
	});
});