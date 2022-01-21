@Echo Off

Title Pulling latest code...

Set Esccape=
cd /d %~dp0

Set LogFile=%2
If [%LogFile%]==[] (
	Set LogFile=Pull.log
)

Echo ** Pulling the latest code at %date% %time%
Echo ** Pulling the latest code at %date% %time% >> %LogFile%

Set SourceCodeFolder=%1
If [%SourceCodeFolder%]==[] (
	Echo %Esccape%[93m You MUST specify the source code folder! %Esccape%[0m
	Echo You MUST specify the source code folder! >> %LogFile%
	Goto End
)

If Not Exist %SourceCodeFolder% (
	Echo %Esccape%[93m The folder [%SourceCodeFolder%] does not exist, abort! %Esccape%[0m
	Echo The folder [%SourceCodeFolder%] does not exist, abort! >> %LogFile%
	Goto End
)

:: Branch is empty means do not switch branch, just pull the latest change of current branch
Set Branch=%3

Title Pulling latest code from branch [%Branch%] to the folder [%SourceCodeFolder%]...
Echo Pulling latest code from branch [%Branch%] to the folder [%SourceCodeFolder%]...
If [%Branch%]==[] (
	Echo Pulling latest code of current branch to the folder [%SourceCodeFolder%]... >> %LogFile%
) Else (
	Echo Pulling latest code of branch [%Branch%] to the folder [%SourceCodeFolder%]... >> %LogFile%
)


Pushd %SourceCodeFolder%

git pull --progress "origin" %Branch%

Popd %SourceCodeFolder%

Title Pull latest code from branch [%Branch%] to the folder [%SourceCodeFolder%] - DONE

:End
Echo ** Pulling the latest code ended at %date% %time%
Echo ** Pulling the latest code ended at %date% %time% >> %LogFile%