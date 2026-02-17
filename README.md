# TimeBudget

FastAPI application with SQLAlchemy ORM. Models: Projects (has many Tasks), Tasks (has one User), Shifts (has one User).

## Setup

Use a **virtual environment** so the app uses the correct dependency versions (SQLAlchemy 2.x required). Do **not** rely on the system `python3-sqlalchemy` package (it is often 1.x and incompatible).

```bash
python3 -m venv .venv
source .venv/bin/activate   # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

## Run

From the **project root** (the directory that contains `backend/`):

```bash
uvicorn backend.main:app --reload
```

Or from anywhere using the runner script (handy when your working directory is `backend/`, e.g. on Forge):

```bash
./backend/run.sh --host 0.0.0.0 --port 8005
```

## Deployment (e.g. Forge)

1. Create and use a venv so the app does not use system Python packages (system SQLAlchemy is often 1.x and causes `cannot import name 'mapped_column'`):
   ```bash
   cd /home/forge/time_budgeter20-0aprwuxe.on-forge.com/current
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```
2. Start the app with the venv’s Python (e.g. in your start command):
   ```bash
   /home/forge/time_budgeter20-0aprwuxe.on-forge.com/current/.venv/bin/python -m uvicorn backend.main:app --host 0.0.0.0 --port 8005
   ```
   Or run `./backend/run.sh` with the venv already activated.

API docs: http://127.0.0.1:8000/docs

## Models

- **User** – name, email
- **Project** – name, description; has many Tasks
- **Task** – title, description, status; belongs to Project and User
- **Shift** – start_time, end_time; belongs to User
# time_budgeter2.0
