$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$sourceRoot = Join-Path $taskRoot 'source-integrated'
$taskNode = 'C:/Users/Royin/AppData/Local/npm-cache/_npx/52027bd8fc0022aa/node_modules/node/bin/node.exe'
Set-Location -LiteralPath $sourceRoot
$env:PATH = (Split-Path -Parent $taskNode) + [IO.Path]::PathSeparator + $env:PATH
& $taskNode (Join-Path $PSScriptRoot 'verify-text-only.mjs') *> (Join-Path $PSScriptRoot 'text-only-verification.log')
if ($LASTEXITCODE -ne 0) { throw 'Text-only AST verification failed' }
$tests = @('case-lessons', 'case-export-race', 'worksheets', 'worksheet-language', 'worksheet-export-race', 'lessons', 'lessons-ui-core', 'lessons-round2', 'lessons-history', 'i18n', 'assessment', 'assessment-flights', 'case-worksheets') | ForEach-Object { "tests/$_.test.ts" }
& $taskNode 'node_modules/vitest/vitest.mjs' run @tests --reporter=default --reporter=json "--outputFile.json=$PSScriptRoot/final-focused.json" *> (Join-Path $PSScriptRoot 'final-focused.log')
$testExit = $LASTEXITCODE
Set-Content -LiteralPath (Join-Path $PSScriptRoot 'final-focused.exit') -Value $testExit
& $taskNode 'node_modules/typescript/bin/tsc' --noEmit *> (Join-Path $PSScriptRoot 'final-build.log')
$typeExit = $LASTEXITCODE
if ($typeExit -eq 0) {
    & $taskNode 'node_modules/vite/bin/vite.js' build *>> (Join-Path $PSScriptRoot 'final-build.log')
    $buildExit = $LASTEXITCODE
} else { $buildExit = $typeExit }
Set-Content -LiteralPath (Join-Path $PSScriptRoot 'final-build.exit') -Value $buildExit
$record = [ordered]@{
    finishedAt = [DateTime]::UtcNow.ToString('o')
    sourceHead = (git rev-parse HEAD)
    runtime = (& $taskNode --version)
    localizedTextChanges = 'text-only-verification.json contains baseline and exact changed source SHA-256 values'
    testExit = $testExit
    typecheckExit = $typeExit
    buildExit = $buildExit
    testFiles = $tests
}
$record | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $PSScriptRoot 'final-runtime.json') -Encoding utf8
$record | ConvertTo-Json -Depth 4
if ($testExit -ne 0 -or $buildExit -ne 0) { exit 1 }
