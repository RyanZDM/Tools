@Echo Off

Title Pull latest code and build all

Set Esccape=

cd /d %~dp0

Set LogFile=%~dp0PullAndBuild.log

If Not Exist %CAPTURECONSOLEREPO% (
	Echo %Esccape%[93m The folder [%CAPTURECONSOLEREPO%] does not exist, abort! %Esccape%[0m
	Echo The folder [%CAPTURECONSOLEREPO%] does not exist, abort! >> %LogFile%
	Goto End
)

Echo * Pulling the latest code and build all at %date% %time%
Echo. >> %LogFile%
Echo * Pulling the latest code and build all at %date% %time% >> %LogFile%

Call Pull.cmd %CAPTURECONSOLEREPO% %LogFile%
Echo.
Call Build.cmd %CAPTURECONSOLEREPO% %LogFile%

:End
Echo * Pulling the latest code and build ended at %date% %time%
Echo * Pulling the latest code and build ended at %date% %time% >> %LogFile%