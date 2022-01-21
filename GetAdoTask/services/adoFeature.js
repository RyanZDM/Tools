/**
 *construct a ADO feature object from JSON object
 *
 *param jsonObj		The json object contains one ADO feature
 *
 *return			The ADO feature collection
 */
function adoFeature(jsonObj, linkBase) {
	this.Id = ("id" in jsonObj) ? jsonObj["id"] : "";
	this.Link = linkBase + this.Id;
	
	if (!jsonObj["fields"]) return;

	this.Title = jsonObj["fields"]["System.Title"];
	
}