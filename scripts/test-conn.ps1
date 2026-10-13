$env:PGPASSWORD = 'busgo_secure_pass_2026'
& 'C:\Program Files\PostgreSQL\18\bin\psql.exe' -U busgo_app -d busgo_db -h localhost -c 'SELECT current_user, current_database();'
