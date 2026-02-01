Services contain business logic only.

Rules:
- No HTTP, no req/res objects
- No SQL outside repositories
- All money movement must happen inside a DB transaction
- Services return domain results, not HTTP responses