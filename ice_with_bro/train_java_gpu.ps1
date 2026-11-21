param(
    [Parameter(Mandatory=$true)][ValidateRange(1,100000)][int]$TrainPerClass,
    [Parameter(Mandatory=$true)][ValidateRange(1,100000)][int]$FineTunePerClass,
    [Parameter(Mandatory=$true)][ValidateRange(1,100000)][int]$TestPerClass,
    [Parameter(Mandatory=$true)][ValidateRange(1,10000)][int]$Epochs,
    [string]$RunDirectory,
    [ValidateSet('compact','spatial')][string]$Architecture = 'spatial',
    [string]$CropDirectory,
    [string]$FeatureSource,
    [switch]$VerifyAndInstall,
    [switch]$AllowNativeAllocations
)
$ErrorActionPreference = 'Stop'
if (-not $AllowNativeAllocations) {
    throw 'Training is gated: fixed ND4J workspaces do not bound every CUDA/cuDNN allocation. Use -AllowNativeAllocations only after explicitly accepting that limitation.'
}
$projectRoot = Split-Path -Parent $PSScriptRoot
$backendRoot = Join-Path $projectRoot 'coffee_with_bro'
function Invoke-CheckedNative([string]$Executable, [string[]]$Arguments) {
    $executablePath = (Get-Command $Executable -ErrorAction Stop).Source
    $nativePreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        & $executablePath @Arguments
        $nativeExit = $LASTEXITCODE
    } finally { $ErrorActionPreference = $nativePreference }
    if ($nativeExit -ne 0) { throw "Native command failed ($nativeExit): $Executable" }
}
if (-not $RunDirectory) { $RunDirectory = 'ice_with_bro/runs/java-cuda-' + [DateTime]::UtcNow.ToString('yyyyMMdd-HHmmss-fff') }
$requestedRunPath = if ([IO.Path]::IsPathRooted($RunDirectory)) { $RunDirectory } else { Join-Path $projectRoot $RunDirectory }
$absoluteRunPath = [IO.Path]::GetFullPath($requestedRunPath)
Push-Location -LiteralPath $backendRoot
try {
    Invoke-CheckedNative '.\mvnw.cmd' @('-Pcuda', '-DskipTests', 'compile', 'dependency:build-classpath', '-Dmdep.outputFile=target/cuda-classpath.txt', '-B', '-ntp')
    $trainingClasspath = (Get-Content -LiteralPath 'target/cuda-classpath.txt' -Raw).Trim()
    $trainingArguments = @('--enable-native-access=ALL-UNNAMED', '-Xmx3g',
        "-Dasl.projectRoot=$projectRoot", '-Dasl.allowNativeAllocations=true',
        "-Dasl.architecture=$Architecture",
        '-cp', "target/classes;$trainingClasspath", 'com.coffeewithbro.coffee_with_bro.ml.TrainGpuAsl',
        "$TrainPerClass", "$FineTunePerClass", "$TestPerClass", "$Epochs")
    if ($CropDirectory) {
        $cropPath = if ([IO.Path]::IsPathRooted($CropDirectory)) { $CropDirectory } else { Join-Path $projectRoot $CropDirectory }
        $trainingArguments = @("-Dasl.cropDirectory=$([IO.Path]::GetFullPath($cropPath))") + $trainingArguments
    }
    if ($FeatureSource) {
        $featurePath = if ([IO.Path]::IsPathRooted($FeatureSource)) { $FeatureSource } else { Join-Path $projectRoot $FeatureSource }
        $trainingArguments = @("-Dasl.featureSource=$([IO.Path]::GetFullPath($featurePath))") + $trainingArguments
    }
    $trainingArguments += $absoluteRunPath
    Invoke-CheckedNative 'java' $trainingArguments
    if ($VerifyAndInstall) {
        $verificationCrops = if ($CropDirectory) { [IO.Path]::GetFullPath($cropPath) } else { Join-Path $absoluteRunPath 'crops' }
        Invoke-CheckedNative 'java' @('-Xmx512m', '-cp', "target/classes;$trainingClasspath", 'com.coffeewithbro.coffee_with_bro.ml.VerifyGpuWorkflow', $projectRoot, $absoluteRunPath, $verificationCrops)
        $installRun = if (Select-String -LiteralPath (Join-Path $absoluteRunPath 'temperature-calibration.properties') -Pattern '^accepted=true$' -Quiet) {
            Join-Path $absoluteRunPath 'temperature-calibrated'
        } else { $absoluteRunPath }
        Invoke-CheckedNative 'java' @('-cp', "target/classes;$trainingClasspath", 'com.coffeewithbro.coffee_with_bro.ml.InstallAslModel', $projectRoot, $installRun)
        Invoke-CheckedNative 'java' @('-cp', "target/classes;$trainingClasspath", 'com.coffeewithbro.coffee_with_bro.ml.ReportGpuTraining', $projectRoot, $installRun)
    }
} finally { Pop-Location }
