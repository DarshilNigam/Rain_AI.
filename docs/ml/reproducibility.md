# R.A.I. End-to-End Reproducibility Guide

Follow these exact steps to reproduce the entire dataset build, model training, evaluation, and inference server:

```powershell
# 1. Activate Environment
.\.venv\Scripts\Activate.ps1

# 2. Build Dataset & Run Quality Validation
python -m ml.pipelines.build_dataset

# 3. Perform Leakage Audit
python -m ml.features.leakage_audit

# 4. Train Models, Calibrate, and Register Artifacts
python -m ml.training.train_xgb

# 5. Run Automated Pytest Suite
python -m pytest ml/tests

# 6. Launch REST Inference Server
python -m uvicorn ml.server:app --host 127.0.0.1 --port 8000
```
