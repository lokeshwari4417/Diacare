"""
Convenience script: creates a demo admin account (and a demo doctor/NGO/
patient) so you can log in immediately after first run without going
through manual registration for every role.

Run with:  python seed_admin.py
"""
from app.database import SessionLocal, engine, Base
from app import models
from app.security import hash_password

Base.metadata.create_all(bind=engine)
db = SessionLocal()

# Remove old/misspelled admin users
db.query(models.User).filter(
    models.User.email.in_(["admin@diacare.demo", "lokeshwaritharunumar@gmail.com"])
).delete(synchronize_session=False)
db.commit()

DEMO_USERS = [
    ("Dr. Asha Rao", "doctor@diacare.demo", "doctor123", models.RoleEnum.doctor),
    ("HopeWell NGO Worker", "ngo@diacare.demo", "ngo12345", models.RoleEnum.ngo),
    ("Priya Patient", "patient@diacare.demo", "patient123", models.RoleEnum.patient),
    ("System Admin", "lokeshwaritharunkumar@gmail.com", "sandhiya@12345", models.RoleEnum.admin),
]

for name, email, password, role in DEMO_USERS:
    existing = db.query(models.User).filter(models.User.email == email).first()
    if existing:
        # If the custom admin already exists, update its password and role/status
        existing.hashed_password = hash_password(password)
        existing.status = "active"
        existing.is_active = True
        print(f"Updated password & status for {email}")
        continue
    user = models.User(
        name=name,
        email=email,
        hashed_password=hash_password(password),
        role=role,
        status="active"
    )
    db.add(user)
    print(f"Created {role.value}: {email} / {password}")

db.commit()
db.close()
print("Done. You can now log in with any of the demo accounts above.")


