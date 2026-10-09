#!/usr/bin/env python
# -*- coding: utf-8 -*-
import pyodbc

conn_str = r'Driver={ODBC Driver 17 for SQL Server};Server=94.72.114.174,1433;Database=COMBATARMS_WEB;UID=combatadmin;PWD=Admin123456'

try:
    conn = pyodbc.connect(conn_str)
    cursor = conn.cursor()
    
    # Obtener todas las tablas
    cursor.execute('''
    SELECT TABLE_NAME 
    FROM INFORMATION_SCHEMA.TABLES 
    WHERE TABLE_SCHEMA = 'dbo'
    ORDER BY TABLE_NAME
    ''')
    
    tables = [row[0] for row in cursor.fetchall()]
    
    # Para cada tabla, obtener estructura
    schema = {}
    for table in tables:
        cursor.execute(f'''
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = '{table}'
        ORDER BY ORDINAL_POSITION
        ''')
        
        columns = []
        for row in cursor.fetchall():
            col_name, data_type, is_nullable, default = row
            columns.append({
                'name': col_name,
                'type': data_type,
                'nullable': is_nullable,
                'default': default
            })
        
        schema[table] = columns
    
    # Imprimir estructura
    for table_name, columns in schema.items():
        print(f'\n{table_name}:')
        print('-' * 80)
        for col in columns:
            nullable = 'NULL' if col['nullable'] == 'YES' else 'NOT NULL'
            default_str = f" DEFAULT {col['default']}" if col['default'] else ""
            print(f"  {col['name']:<30} {col['type']:<20} {nullable}{default_str}")
    
    conn.close()
    
except Exception as e:
    print(f'Error: {e}')
    import traceback
    traceback.print_exc()
