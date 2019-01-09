/**
 *construct a Rally feature object from JSON object
 *
 *param jsonObj		The json object contains one Rally feature
 *
 *return			The Rally feature collection
 */
function RallyFeature(jsonObj) {
	this.Id = ('FormattedID' in jsonObj) ? jsonObj['FormattedID'] : '';
	// The id 88538884208ud means ImageView Software project
	this.Link = ('_ref' in jsonObj) ? jsonObj['_ref'].toLowerCase()
													.replace('slm/webservice/v2.0', '#/88538884208ud/detail') : '';
	
	this.Description = ('Name' in jsonObj) ? jsonObj['Name'] : '';
	this.StoryCount = (jsonObj['LeafStoryCount']) ? jsonObj['LeafStoryCount'] : 0;
	this.PlanEstimateTotal = (jsonObj['LeafStoryPlanEstimateTotal']) ? jsonObj['LeafStoryPlanEstimateTotal'] : 0;
	this.PercentDoneByStoryCount = (jsonObj['PercentDoneByStoryCount']) ? jsonObj['PercentDoneByStoryCount'] : 0;
	this.PercentDoneByStoryPlanEstimate = (jsonObj['PercentDoneByStoryPlanEstimate']) ? jsonObj['PercentDoneByStoryPlanEstimate'] : 0;
	this.Release = '';
	this.Project = '';
	this.Owner = '';

	(function (that) {
		if (jsonObj['Owner'] && jsonObj.Owner['_refObjectName']) {
			that.Owner = jsonObj.Owner._refObjectName;
		}
		
		if (jsonObj['Release'] && jsonObj.Release['_refObjectName']) {
			that.Release = jsonObj.Release._refObjectName;
		}

		if (jsonObj['Project'] && jsonObj.Project['_refObjectName']) {
			that.Project = jsonObj.Project._refObjectName;
		}
	})(this);
}