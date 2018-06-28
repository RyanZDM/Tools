import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'Get Rally Tasks';
}

export class Task {	
	id: string;
	Link: string;
	Description: string;
	Estimate: string;
	TimeSpent: string;
	Owner: string;
	Iteration: number;
	
	constructor(jsonObj: any) {
		this.id = ('FormattedID' in jsonObj) ? jsonObj['FormattedID'] : '';
		this.Link = ('_ref' in jsonObj) ? jsonObj['_ref'].toLowerCase()
														.replace('slm/webservice/v2.0', '#/90211740268ud/detail')
														.replace('hierarchicalrequirement', 'userstory') : '';
		this.Description = ('Name' in jsonObj) ? jsonObj['Name'] : '';
		this.Estimate = (jsonObj['PlanEstimate']) ? jsonObj['PlanEstimate'] : 0;
		this.TimeSpent = (jsonObj['TaskEstimateTotal']) ? jsonObj['TaskEstimateTotal'] : 0;
		this.Owner = '';
		this.Iteration = 0;

		if (jsonObj['Owner'] && jsonObj.Owner['_refObjectName']) {
			this.Owner = jsonObj.Owner._refObjectName;
		}

		if (jsonObj['Iteration'] && jsonObj.Iteration['_refObjectName']) {
			var sprint = jsonObj.Iteration._refObjectName.split(' ').pop();
			this.Iteration = parseInt(sprint, 10);
		}
	}
}
