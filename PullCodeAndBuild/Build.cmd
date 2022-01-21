@Echo Off

Title Building All...

Set Esccape=
cd /d %~dp0

Set LogFile=%2
If [%LogFile%]==[] (
	Set LogFile=Pull.log
)

Echo ** Building all at %date% %time%
Echo ** Building all at %date% %time% >> %LogFile%

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

Set Product=%3
If [%Product%]==[] (
	Set Product=EVO
)

Pushd %SourceCodeFolder%

Title Building all for the product [%Product%]...
Echo Building all for the product [%Product%]...
Echo Building all for the product [%Product%]... >> %LogFile%

net use \\shdataserver20\hi-dcs-release dr /user:dr
Call Dev_FullReset.cmd %Product% SIM NORMAL false LEAVE

Title Build all for the product [%Product%] - DONE
Popd %SourceCodeFolder%

:End
Echo ** Building all ended at %date% %time%
Echo ** Building all ended at %date% %time% >> %LogFile%