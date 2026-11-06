$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)
$env:CELERY_TASK_ALWAYS_EAGER = "true"
python -m pip install -e ".[dev]" -q
python -m pytest -q
