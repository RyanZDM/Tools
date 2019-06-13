'use strict';

define(['app'], function (app) {
	app.service('rallyRestApi', function () {
		var urlFeature = 'https://rally1.rallydev.com/slm/webservice/v2.0/PortfolioItem/Feature?\
							query=(<QueryString>)\
							&order=FormattedID\
							&fetch=FormattedID,Name,Owner,Release,Project,StoryCount,PlanEstimateTotal,PercentDoneByStoryCount,PercentDoneByStoryPlanEstimate\
							&pagesize=1999';
		var urlTask = 'https://rally1.rallydev.com/slm/webservice/v2.0/\
							<target>?\
							query=(<dateCondition> <ownerStateCondition>)\
							&order=Iteration,LastUpdateDate\
							&fetch=FormattedID,Name,Owner,PlanEstimate,TaskEstimateTotal,Tasks,Iteration,ScheduleState,State,Description,Notes,c_AcceptanceCriteria,c_RootCauseDescription\
							&pagesize=1999';
		var ownerEmailMapping = {
			"Ryan Zhang": "dameng.zhang@carestream.com",
			// "Joe Z": "joe.zhang@carestream.com",
			// "Peter Y": "qinqiang.yan@carestream.com",
			"Mark Gu": "jiandong.gu@carestream.com",
			"Qi Wang": "qi.wang@carestream.com",
			"Gary Liu": "gary.liu@carestream.com",
			// "Lyman M": "liang.ma@carestream.com",
			// "Jun Sun": "jun.sun@carestream.com",
			// "Zhe S": "zhe.sun@carestream.com",
			"Jiaxin Yao": "yao.jiaxin@carestream.com",
			// "Xianjun Z": "xianjun.zhan@carestream.com",
			//"Iris J": "lili.jiang@carestream.com",
			"Forrest Feng": "changzheng.feng@carestream.com",
			//"Cheng Luo": "cheng.luo@carestream.com",
			"Benny Liu": "lei.liu@carestream.com",
			"Dean Peng": "dean.peng@carestream.com",
			"DongXiao Liu": "dongxiao.liu@carestream.com",
			"Taylor Tao": "lian.tao@carestream.com",
			"Song Zhao": "song.zhao@carestream.com"
		};

		function getDateCondition(sprint) {
			var dateCondition = '((AcceptedDate >= "2019-01-01") OR (InProgressDate >= "2019-01-01")) and ';
			if (sprint > 0) {
				dateCondition = '(Iteration.Name = "Sprint ' + sprint + '") and ';
			}

			return dateCondition;
		};

		return {
			// The id 88538884208ud means ImageView Software project
			// The id 278792303760ud means Software project in new workspace
			CurrentWorkspace: '278792303760ud',

			OwnerEmailMapping: ownerEmailMapping,

			UrlFeature: urlFeature,

			// <target> must be either 'defect' or 'hierarchicalrequirement', the blank spack befor and operator are MUST
			UrlTask: urlTask,

			UrlWarnings: {
				NoRelease: {
					Desc: 'USER STORIES IN A SPRINT THAT HAVE NO RELEASE (SHOULD HAVE A RELEASE)',
					Urls: ['https://rally1.rallydev.com/slm/webservice/v2.0/hierarchicalrequirement?query=((Iteration != null) AND (Release = null)) &order=Owner&fetch=FormattedID,Name,Owner,Iteration',
							'https://rally1.rallydev.com/slm/webservice/v2.0/defect?query=((Iteration != null) AND (Release = null)) &order=Owner&fetch=FormattedID,Name,Owner,Iteration']
				},

				NoEstimation: {
					Desc: "USER STORIES OR DEFECTS IN A SPRINT THAT DON'T HAVE A PLAN ESTIMATE (SHOULD HAVE A PLAN ESTIMATE)",
					Urls: ['https://rally1.rallydev.com/slm/webservice/v2.0/hierarchicalrequirement?query=(((Release.Name contains "1.4") AND (ScheduleState > "Defined")) AND (PlanEstimate = null))&order=Owner&fetch=FormattedID,Name,Owner,Iteration',
							'https://rally1.rallydev.com/slm/webservice/v2.0/defect?query=(((Release.Name contains "1.4") AND (ScheduleState > "Defined")) AND (PlanEstimate = null))&order=Owner&fetch=FormattedID,Name,Owner,Iteration']
				},

				NoFeature: {
					Desc: 'USER STORIES THAT ARE NOT ASSOCIATED WITH A FEATURE (ALL USER STORIES SHOULD BE UNDER A FEATURE)',
					Urls: ['https://rally1.rallydev.com/slm/webservice/v2.0/hierarchicalrequirement?query=((Release.Name contains "1.4") AND (Feature = null))&order=Owner&fetch=FormattedID,Name,Owner,Iteration']
				},

				NoTask: {
					Desc: "USER STORIES IN A SPRINT THAT DON'T HAVE ANY TASK ESTIMATES (OR HAVE NO TASK CREATED)",
					Urls: ['https://rally1.rallydev.com/slm/webservice/v2.0/hierarchicalrequirement?query=(((Release.Name contains "1.4") AND (ScheduleState > "Defined")) AND (TaskEstimateTotal = 0))&order=Owner&fetch=FormattedID,Name,Owner,Iteration',
							'https://rally1.rallydev.com/slm/webservice/v2.0/defect?query=(((Release.Name contains "1.4") AND (ScheduleState > "Defined")) AND (TaskEstimateTotal = 0))&order=Owner&fetch=FormattedID,Name,Owner,Iteration']
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

				NoTimeSpent: {
					Desc: 'TASKS THAT ARE IN PROCESS OR COMPLETED, BUT THERE IS NO TIME SPENT TRACKED (UPDATE TIME SPENT THROUGH TIMESHEET)',
					Urls: []
				}
			},

			/**
			 *name			getApiUrlFeature
			 *
			 *description	Gets the actual url for getting feature list from Rally
			 *
			 *param release	The name of release which is used as a filter when querying feature from Rally
			 *
			 *return		Url used for Ajax call for getting feature list from Rally 
			 */
			getApiUrlFeature: function (release) {
				var qry = (release !== '') ? 'Release.Name Contains "' + release + '"'
											: 'Release.Name Contains "1.4"';
				var url = urlFeature.replace('<QueryString>', qry)
									.replace(/\t/g, '');
				return url;
			},

			/**
			 *name			getApiUrlTask
			 *
			 *description	Gets the actual url for getting defect and user story list from Rally with given parameters
			 *
			 *return		Url used for Ajax call for getting defect and user story list from Rally 
			 */
			getApiUrlTask: function (parameters, target) {
				var ownerStateCondition = '(Owner.Name = ' + parameters.Owner + ')';
				if (!parameters.IgnoreScheduleState) {
					ownerStateCondition = '(' + ownerStateCondition + ' and ((ScheduleState = Accepted) OR (ScheduleState = Completed)))'
				}

				var actualApiUrl = urlTask.replace('<target>', target)
											.replace('<ownerStateCondition>', ownerStateCondition)
											.replace('<dateCondition>', getDateCondition(parameters.Sprint))
											.replace(/\t/g, '');

				return actualApiUrl;
			},

			/**
			 *name			getApiUrlTask
			 *
			 *description	Gets the actual url for getting defect and user story list from Rally with given parameters
			 *
			 *return		Url used for Ajax call for getting defect and user story list from Rally 
			 */
			getApiUrlSubTask: function (taskUrl) {
				//return taskUrl + "?query=(State = Completed) &fetch=Owner,TimeSpent,Actuals&pagesize=1999";
				return taskUrl + "?&fetch=Owner,Actuals&pagesize=1999";
			}
		};
	});
});