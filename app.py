# app.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import sqlite3
from typing import Optional, List
from pydantic import BaseModel

app = FastAPI(
    title="CityLocal API",
    description="API for city transportation alerts, relevant police reports, and city council news",
    version="1.0.0"
)

# CORS middleware - for interaction with frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend URL like ["http://localhost:3000"]
    allow_credentials=True,
    allow_methods=["*"],  # Allow GET, POST, PUT, DELETE
    allow_headers=["*"],  # Allow all headers
)


def get_db_connection():
    try:
        conn = sqlite3.connect('city_locals.db')
        conn.row_factory = sqlite3.Row  # Returns dict-like rows instead of tuples
        return conn
    except sqlite3.Error as e:
        raise HTTPException(status_code=500, detail=f"Database connection failed: {str(e)}")

# Response model for better API docs
class Alert(BaseModel):
    id: int
    timestamp: str
    content: str
    alert_type: str
    is_major: bool
    is_active: bool

@app.get("/")
def root():
    return {"message": "CityLocal API is running!", "docs": "/docs"}

@app.get("/api/alerts", response_model=List[Alert])
def get_alerts(
    alert_type: Optional[str] = None,
    is_major: Optional[bool] = None,
    is_active: Optional[bool] = True,
    limit: Optional[int] = 100
):
    """
    Get alerts with optional filtering
    
    - **alert_type**: Filter by type (transit, traffic, police_report, city_council)
    - **is_major**: Filter by major alerts (True/False)
    - **is_active**: Filter by active status (default: True)
    - **limit**: Maximum number of results (default: 100)
    """
    conn = get_db_connection()
    
    try:
        query = "SELECT * FROM alerts WHERE 1=1"
        params = []
        
        if alert_type:
            query += " AND alert_type = ?"
            params.append(alert_type)
        
        if is_major is not None:
            query += " AND is_major = ?"
            params.append(is_major)
            
        if is_active is not None:
            query += " AND is_active = ?"
            params.append(is_active)
        
        query += " ORDER BY id DESC LIMIT ?"
        params.append(limit)
        
        alerts = conn.execute(query, params).fetchall()
        return [dict(alert) for alert in alerts]
        
    except sqlite3.Error as e:
        raise HTTPException(status_code=500, detail=f"Database query failed: {str(e)}")
    finally:
        conn.close()

@app.get("/api/alerts/types")
def get_alert_types():
    """Get all available alert types"""
    conn = get_db_connection()
    
    try:
        types = conn.execute("SELECT DISTINCT alert_type FROM alerts ORDER BY alert_type").fetchall()
        return [t[0] for t in types]
    except sqlite3.Error as e:
        raise HTTPException(status_code=500, detail=f"Database query failed: {str(e)}")
    finally:
        conn.close()

@app.get("/api/alerts/stats")
def get_alert_stats():
    """Get statistics about alerts"""
    conn = get_db_connection()
    
    try:
        # Count by type
        type_counts = conn.execute("""
            SELECT alert_type, COUNT(*) as count 
            FROM alerts 
            WHERE is_active = 1 
            GROUP BY alert_type
        """).fetchall()
        
        # Count major alerts
        major_count = conn.execute("SELECT COUNT(*) FROM alerts WHERE is_major = 1 AND is_active = 1").fetchone()[0]
        
        # Total active alerts
        total_active = conn.execute("SELECT COUNT(*) FROM alerts WHERE is_active = 1").fetchone()[0]
        
        return {
            "total_active": total_active,
            "major_alerts": major_count,
            "by_type": {row[0]: row[1] for row in type_counts}
        }
    except sqlite3.Error as e:
        raise HTTPException(status_code=500, detail=f"Database query failed: {str(e)}")
    finally:
        conn.close()

@app.get("/api/alerts/{alert_id}")
def get_alert_by_id(alert_id: int):
    """Get a specific alert by ID"""
    conn = get_db_connection()
    
    try:
        alert = conn.execute("SELECT * FROM alerts WHERE id = ?", (alert_id,)).fetchone()
        if not alert:
            raise HTTPException(status_code=404, detail="Alert not found")
        return dict(alert)
    except sqlite3.Error as e:
        raise HTTPException(status_code=500, detail=f"Database query failed: {str(e)}")
    finally:
        conn.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
