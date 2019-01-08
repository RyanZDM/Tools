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
	this.Link = ('_ref' in jsonObj) ? jsonObj['_ref'].toLowerCase()
													.replace('slm/webservice/v2.0', '#/88538884208ud/detail')
													.replace('hierarchicalrequirement', 'userstory') : '';
	this.Description = ('Name' in jsonObj) ? jsonObj['Name'] : '';
	this.Estimate = (jsonObj['PlanEstimate']) ? jsonObj['PlanEstimate'] : 0;
	this.TimeSpent = (jsonObj['TaskEstimateTotal']) ? jsonObj['TaskEstimateTotal'] : 0;
	this.Owner = '';
	this.Iteration = '';
	this.TaskLink = '';

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
	})(this);
}