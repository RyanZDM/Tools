/**
 *construct a Rally task object from JSON object
 *
 *param jsonObj		The json object contains one Rally defects and/or user stories
 *
 *return			The Rally task collection
 */
function RallyTask(jsonObj) {
	this.id = ('FormattedID' in jsonObj) ? jsonObj['FormattedID'] : '';
	// The id 88538884208ud means ImageView Software project
	// The id 278792303760ud means Software project in new workspace
	this.Link = ('_ref' in jsonObj) ? jsonObj['_ref'].toLowerCase()
													.replace('slm/webservice/v2.0', '#/278792303760ud/detail')
													.replace('hierarchicalrequirement', 'userstory') : '';
	this.Title = ('Name' in jsonObj) ? jsonObj['Name'] : '';
	this.Description = (jsonObj['Description']) ? jsonObj['Description'] : '';
	this.Description = this.Description.replace(/<br \/>/g, '\n')
										.replace(/&nbsp;/g, ' ')
										.replace(/&lt;/g, '<')
										.replace(/&gt;/g, '>')
										.replace(/<\/?p>|<\/?strong>|<\/?span[^>]*>|<\/?p[^>]*>|<\/?a[^>]*>/g, '')
										;
	this.Estimate = (jsonObj['PlanEstimate']) ? jsonObj['PlanEstimate'] : 0;
	this.TimeSpent = (jsonObj['TaskEstimateTotal']) ? jsonObj['TaskEstimateTotal'] : 0;
	this.ScheduleState = jsonObj['ScheduleState'];
	this.Owner = (jsonObj['Owner'] && jsonObj.Owner['_refObjectName']) ? jsonObj.Owner._refObjectName : '';
	this.Release = (jsonObj['Release']) ? (jsonObj.Release['Name'] ? jsonObj.Release.Name : jsonObj.Release._refObjectName) : '';
	this.TaskLink = (jsonObj['Tasks'] && jsonObj.Tasks.Count > 0) ? this.TaskLink = jsonObj.Tasks._ref : '';
	this.Reject = ((jsonObj['State']) && (/rejected|reject requested/i.test(jsonObj['State']))) ? true : false;
	this.EverFailed = (jsonObj['Description']) ? (jsonObj['Description'].toLowerCase().indexOf('[eetfail') != -1) : false;	// [EETFailed] or [EETFail]
	this.Blocked = jsonObj.Blocked;
	this.BlockedReason = (this.Blocked && jsonObj['BlockedReason']) ? jsonObj.BlockedReason : '';
	this.Priority = (jsonObj['Priority']) ? jsonObj['Priority'] : '';
	this.Iteration = '';
	this.AC = '';
	this.Testable = true;
	this.UTNeed = 'Missed';
	this.Rank = (jsonObj['DragAndDropRank']) ? jsonObj.DragAndDropRank : 'ZZ';
	this.FlowStateChangedDate = (jsonObj['FlowStateChangedDate']) ? jsonObj['FlowStateChangedDate'] : '';
	this.Project = (jsonObj['Project']) ? jsonObj['Project']._refObjectName : '';
	this.Feature = (jsonObj['Feature']) ? jsonObj['Feature']._refObjectName : '';
	this.Other = '';

	this.clone = function (exclude) {
		var excludes = [];
		if (Array.isArray(exclude)) {
			excludes = exclude;
		} else if (typeof exclude === 'string') {
			excludes.push(exclude);
		}

		var newTask = {};
		for (var propertyName in this) {
			if (!excludes.includes(propertyName)) {
				newTask[propertyName] = this[propertyName];
			}
		}

		return newTask;
	};

	if (jsonObj['c_PLIEventCRNumber']) {
		this.id = this.id + '/' + jsonObj.c_PLIEventCRNumber;
	}

	if (jsonObj['Iteration'] && jsonObj.Iteration['_refObjectName']) {
		var sprint = jsonObj.Iteration._refObjectName.split(' ').pop();
		this.Iteration = parseInt(sprint, 10);
	}

	if (jsonObj['c_AcceptanceCriteria']) {
		this.AC = jsonObj['c_AcceptanceCriteria'];
		if (/no testable|not testable|non-testable|No need for QA verification/i.test(this.AC)) {
			this.Testable = false;
		}
	} else {
		if (jsonObj['Notes']) {
			this.AC = jsonObj['Notes'];
		}
	}

	switch (this.Priority) {
		case 'Resolve Immediately':
			this.Priority = '1 - ' + this.Priority;
			break;
		case 'High':
			this.Priority = '2 - ' + this.Priority;
			break;
		case 'Medium':
			this.Priority = '3 - ' + this.Priority;
			break;
		case 'Low':
			this.Priority = '4 - ' + this.Priority;
			break;
		default:
			// do nothong
	}

	(function (that) {
		if (that.Reject || (that.id.indexOf('US') != -1)) {
			// NA for user story or a reject defect
			that.UTNeed = 'NA';
			return;
		}

		if (that.ScheduleState != 'Completed' && that.ScheduleState != 'Accepted') {
			// Leave as empty since not complete yet
			that.UTNeed = '';
			return;
		}

		if (jsonObj['c_RootCauseDescription']) {
			var rootCause = jsonObj['c_RootCauseDescription'].toLowerCase();
			if (rootCause.indexOf('[utyes]') != -1) {
				that.UTNeed = 'Y';
			} else if (rootCause.indexOf('[utno]') != -1) {
				that.UTNeed = 'N';
			}
		}
	})(this);
}