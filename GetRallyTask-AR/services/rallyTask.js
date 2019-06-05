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
	this.Description = ('Name' in jsonObj) ? jsonObj['Name'] : '';
	this.Estimate = (jsonObj['PlanEstimate']) ? jsonObj['PlanEstimate'] : 0;
	this.TimeSpent = (jsonObj['TaskEstimateTotal']) ? jsonObj['TaskEstimateTotal'] : 0;
	this.Owner = '';
	this.Iteration = '';
	this.TaskLink = '';
	this.AC = '';
	this.Testable = true;
	this.UTNeed = 'NA';
	this.Reject = false;
	this.EverFailed = (jsonObj['Description'] && (jsonObj['Description'].toLowerCase().indexOf('[eetfail') != -1));		// [EETFailed] or [EETFail]

	(function (that) {
		if (jsonObj['Owner'] && jsonObj.Owner['_refObjectName']) {
			that.Owner = jsonObj.Owner._refObjectName;
		}

		if (jsonObj['Iteration'] && jsonObj.Iteration['_refObjectName']) {
			var sprint = jsonObj.Iteration._refObjectName.split(' ').pop();
			that.Iteration = parseInt(sprint, 10);
		}

		if (jsonObj['Tasks'] && jsonObj.Tasks.Count > 0) {
			that.TaskLink = jsonObj.Tasks._ref;
		}

		if (jsonObj['State']) {
			if (/rejected|reject requested/i.test(jsonObj['State'])) {
				that.Reject = true;
			}
		}

		if (jsonObj['c_AcceptanceCriteria']) {
			that.AC = jsonObj['c_AcceptanceCriteria'];
			if (/no testable|not testable|non-testable|No need for QA verification/i.test(that.AC)) {
				that.Testable = false;
			}
		} else {
			if (jsonObj['Notes']) {
				that.AC = jsonObj['Notes'];
			}
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