# TimeBudget

FastAPI application with SQLAlchemy ORM. Models: Projects (has many Tasks), Tasks (has one User), Shifts (has one User).

## Setup

```bash
pip install -r requirements.txt
```

## Run

```bash
uvicorn backend.main:app --reload
```

API docs: http://127.0.0.1:8000/docs

## Models

- **User** – name, email
- **Project** – name, description; has many Tasks
- **Task** – title, description, status; belongs to Project and User
- **Shift** – start_time, end_time; belongs to User
# time_budgeter2.0
