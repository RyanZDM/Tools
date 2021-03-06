
Declare @projectId int
Declare @startDateValue numeric(19,0)
Declare @SDCDevs Table ( emp_id nvarchar(255) );

Select @projectId = 47	-- ImageView project
Select @startDateValue = CAST(DATEDIFF(s, '1/1/1970', '1/1/2018') as numeric) * 1000
Insert Into @SDCDevs (emp_id) Values('10021985'),('19016122'),('10055164'),('10055167'),('19003519'),('19003574'),('19007443'),('19009315'),('19009335'),('19010661'),('19010827'),('19011083'),('19012973'),('19014859'),('19016830'),('19010857'),('19010641')

-- Get code review list created by developer
select a.*, (CAST(DATEPART(YEAR, a.create_date) as varchar(4)) + '-' + CAST(DATEPART(QUARTER, a.create_date) as char(1))) [quarter] from 
	(Select [user_name] as user_id, display_name, cru_name as review_title, DATEADD(s, cru_create_date/1000, '1/1/1970') as create_date
		From cru_review, cwd_user, @SDCDevs
		Where cru_project = @projectId And cru_creator = id And [user_name] = emp_id And cru_create_date > @startDateValue And cru_state Not In ('Draft','Dead')			
		 ) a
	Order By a.[user_id]

-- Code review summary by Person
Select [user_id], display_name, Count(cru_review_id) as reviews_sent, [year], qtr
	From 
		(Select [user_name] as [user_id], display_name, cru_review_id, dateadd(s, cru_create_date/1000, '1/1/1970') as create_date
			, DATEPART(YEAR, dateadd(s, cru_create_date/1000, '1/1/1970')) as [year], DATEPART(QUARTER, dateadd(s, cru_create_date/1000, '1/1/1970')) as qtr
			From cru_review, cwd_user, @SDCDevs
			Where cru_project = @projectId And cru_creator = id And [user_name] = emp_id And  cru_create_date > @startDateValue And cru_state Not In ('Draft','Dead')) a
	Group By [user_id], display_name, [year], qtr
	Order By [year], qtr, [user_id]

-- Code review comments count by Person
-- Not incude the submitter's replay comments
Select [user_id], [user_name], count(cru_comment_id) as comments_sent, [year], qtr
	From
		(Select u.user_name as [user_id], u.display_name as [user_name], c.cru_comment_id
				, DATEPART(YEAR, dateadd(s, c.cru_create_date/1000, '1/1/1970')) as [year]
				, DATEPART(QUARTER, dateadd(s, c.cru_create_date/1000, '1/1/1970')) as qtr
			From cru_comment c, cru_review r, cwd_user u, @SDCDevs
			Where r.cru_project = @projectId And c.cru_user_id = u.id And c.cru_review_id = r.cru_review_id And c.cru_user_id != r.cru_creator
				And [user_name] = emp_id And c.cru_create_date > @startDateValue
		) a
	Group By [user_id], [user_name], [year], qtr
	Order By [year], qtr, [user_id]