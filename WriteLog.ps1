#  Author: Ryan Zhang
#  Date: 2017-06-27
#
#  Description: Write log
#  
#  Methods:
#    - Set-LogFile <LogFileName>                                // The log file is C:\temp\log.log by default
#    - Write-Log <Message> <Level>[optional, Info by default]
#    - LogAndExit <Message> <ExitCode>[optional, 0 by default] <Level>[optional, Info by default]
#
# *********************************************************************************************************

Set-Variable __logFile "C:\Temp\log.log"

function Set-LogFile
{
    [CmdletBinding()]
    param (
        [Parameter(Mandatory)]
        [string] $LogFileName
    )

    $__logFile = $LogFileName
}

# ******************************* BEGIN THE FUNCTION DEFINE **************************************************
function Write-Log
{
    <#
    .SYNOPSIS
        This function creates or appends a line to a log file.
    .PARAMETER  Message
        The message parameter is the log message you'd like to record to the log file.
    .PARAMETER  Level
        The log level can be "Error", "Warn", and "Info"
    .EXAMPLE
        PS C:\> Write-Log -Message 'Value1'
        This example shows how to call the Write-Log function with named parameters.
    #>
    [CmdletBinding()]
    param (
        [Parameter(Mandatory)]
        [string]$Message,

        [Parameter(Mandatory=$false)] 
        [ValidateSet("Error","Warn","Info")] 
        [string]$Level="Info"
    )
    
    try
    {
        $DateTime = Get-Date -Format ‘yyyy-MM-dd HH:mm:ss’
        
        $logFileFolder = [System.IO.Path]::GetDirectoryName($__logFile)
        if (!(Test-Path $logFileFolder)) { New-Item $logFileFolder -ItemType Directory }
        Add-Content -Value "$DateTime - [$Level] $Message" -Path "$__logFile"
    }
    catch
    {
        Write-Error $_.Exception.Message
    }
}

function LogAndExit
{
    Param 
    (
        [Parameter(Mandatory)] 
        [string]$Message,        
         
        [Parameter(Mandatory=$false)] 
        [int]$ExitCode = 0,

        [Parameter(Mandatory=$false)]
        [string]$Level = "Info"
    )
    
    if ($Message -and $Message.Length -gt 0)
    {
        Write-Log -Level $Level -Message $Message
    }
    
    Exit($ExitCode)
}
# ********************************* END THE FUNCTION DEFINE **************************************************