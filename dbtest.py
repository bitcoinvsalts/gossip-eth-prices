import psycopg2
from psycopg2 import sql
import os
from datetime import datetime, timezone

# Environment variables for database connection
DB_NAME = os.getenv('DB_NAME', 'gossip_eth')
DB_USER = os.getenv('DB_USER', 'eth_user')
DB_PASS = os.getenv('DB_PASS', 'password123')
DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_PORT = os.getenv('DB_PORT', '5432')

def connect_db():
    conn = psycopg2.connect(
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASS,
        host=DB_HOST,
        port=DB_PORT
    )
    return conn

def write_to_db(price, signatures):
    print("111111", len(signatures), time_since_last_entry())
    if len(signatures) >= 3 and time_since_last_entry() >= 30:
        print("=====")
        conn = connect_db()
        cur = conn.cursor()
        insert_query = sql.SQL("""
            INSERT INTO eth_prices (price, signatures, created_at) 
            VALUES (%s, %s, %s)
        """)
        cur.execute(insert_query, (price, signatures, datetime.now(timezone.utc)))
        conn.commit()
        cur.close()
        conn.close()

def time_since_last_entry():
    conn = connect_db()
    cur = conn.cursor()
    select_query = sql.SQL("""
        SELECT created_at FROM eth_prices
        ORDER BY created_at DESC
        LIMIT 1
    """)
    cur.execute(select_query)
    last_entry = cur.fetchone()
    cur.close()
    conn.close()
    if last_entry:
        last_time = last_entry[0].replace(tzinfo=timezone.utc)  # Ensure last_time is timezone-aware in UTC
        current_time = datetime.now(timezone.utc)  # Ensure current time is in UTC
        return (current_time - last_time).total_seconds()
    return float('inf')

def read_from_db():
    conn = connect_db()
    cur = conn.cursor()
    select_query = sql.SQL("""
        SELECT * FROM eth_prices
        ORDER BY created_at DESC
        LIMIT 10
    """)
    cur.execute(select_query)
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return rows

# Example usage
if __name__ == "__main__":
    # Simulate receiving a message with signatures
    example_price = 2000.50
    example_signatures = ["signature1", "signature2", "signature3"]
    print("00000000")
    # Write example data to the database if conditions are met
    write_to_db(example_price, example_signatures)

    # Read and print the latest entries from the database
    entries = read_from_db()
    for entry in entries:
        print(entry)
