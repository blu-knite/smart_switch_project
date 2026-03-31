"""
Simple dashboard to monitor AI decisions and actions
"""

import asyncio
import json
from datetime import datetime, timedelta
from typing import Dict, Any
from pathlib import Path

class AIDashboard:
    """Simple file-based dashboard for AI monitoring"""
    
    def __init__(self, stats_dir: Path = None):
        self.stats_dir = stats_dir or Path(__file__).parent.parent / "data" / "dashboard"
        self.stats_dir.mkdir(exist_ok=True)
        self.stats_file = self.stats_dir / "ai_stats.json"
        self.decisions_file = self.stats_dir / "recent_decisions.json"
        
    async def update(self, ai_engine, action_handler):
        """Update dashboard data"""
        stats = {
            'timestamp': datetime.now().isoformat(),
            'decisions': ai_engine.get_decision_stats() if ai_engine else {},
            'actions': action_handler.get_action_stats() if action_handler else {},
            'system': {
                'uptime': self._get_uptime(),
                'active_since': self._get_start_time().isoformat()
            }
        }
        
        # Write to file
        with open(self.stats_file, 'w') as f:
            json.dump(stats, f, indent=2)
        
        # Keep recent decisions
        if ai_engine and hasattr(ai_engine, 'decision_history'):
            recent = ai_engine.decision_history[-50:]  # Last 50 decisions
            with open(self.decisions_file, 'w') as f:
                json.dump(recent, f, indent=2)
    
    def _get_start_time(self):
        """Get system start time"""
        import psutil
        import os
        p = psutil.Process(os.getpid())
        return datetime.fromtimestamp(p.create_time())
    
    def _get_uptime(self):
        """Get system uptime"""
        delta = datetime.now() - self._get_start_time()
        return str(delta).split('.')[0]  # Remove microseconds


# Simple HTML dashboard (can be served via simple HTTP server)
DASHBOARD_HTML = """
<!DOCTYPE html>
<html>
<head>
    <title>AI Smart Switch Dashboard</title>
    <meta http-equiv="refresh" content="5">
    <style>
        body { font-family: Arial; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: auto; }
        .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 20px 0; }
        .card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .card h3 { margin: 0 0 10px 0; color: #333; }
        .value { font-size: 24px; font-weight: bold; color: #0066cc; }
        .decisions { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f0f0f0; }
        .alert { color: #cc0000; }
        .warning { color: #ff9900; }
        .success { color: #00cc00; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🤖 AI Smart Switch System</h1>
        <div id="stats" class="stats">
            <div class="card">
                <h3>Total Decisions</h3>
                <div class="value" id="total-decisions">0</div>
            </div>
            <div class="card">
                <h3>Actions Today</h3>
                <div class="value" id="actions-today">0</div>
            </div>
            <div class="card">
                <h3>Avg Confidence</h3>
                <div class="value" id="avg-confidence">0%</div>
            </div>
        </div>
        
        <div class="card">
            <h3>System Status</h3>
            <p>Uptime: <span id="uptime">-</span></p>
            <p>Active Since: <span id="active-since">-</span></p>
        </div>
        
        <div class="decisions">
            <h2>Recent AI Decisions</h2>
            <table id="decisions-table">
                <thead>
                    <tr>
                        <th>Time</th>
                        <th>Action</th>
                        <th>Device</th>
                        <th>Confidence</th>
                        <th>Reason</th>
                    </tr>
                </thead>
                <tbody id="decisions-body">
                </tbody>
            </table>
        </div>
    </div>
    
    <script>
        async function updateDashboard() {
            try {
                const stats = await fetch('/stats.json').then(r => r.json());
                const decisions = await fetch('/decisions.json').then(r => r.json());
                
                document.getElementById('total-decisions').textContent = stats.decisions?.total_decisions || 0;
                document.getElementById('actions-today').textContent = stats.actions?.actions_24h || 0;
                document.getElementById('avg-confidence').textContent = 
                    (stats.actions?.avg_confidence * 100 || 0).toFixed(1) + '%';
                document.getElementById('uptime').textContent = stats.system?.uptime || '-';
                document.getElementById('active-since').textContent = stats.system?.active_since || '-';
                
                const tbody = document.getElementById('decisions-body');
                tbody.innerHTML = '';
                
                decisions.slice().reverse().forEach(d => {
                    const row = tbody.insertRow();
                    const time = new Date(d.timestamp).toLocaleTimeString();
                    const decision = d.decision || {};
                    
                    row.insertCell().textContent = time;
                    row.insertCell().textContent = decision.action_type || '-';
                    row.insertCell().textContent = decision.target_device || '-';
                    
                    const confCell = row.insertCell();
                    const confidence = (decision.confidence * 100 || 0).toFixed(1);
                    confCell.textContent = confidence + '%';
                    confCell.className = confidence > 80 ? 'success' : confidence > 60 ? 'warning' : 'alert';
                    
                    row.insertCell().textContent = (decision.reason || '').substring(0, 50) + '...';
                });
            } catch (e) {
                console.error('Dashboard update failed:', e);
            }
        }
        
        setInterval(updateDashboard, 5000);
        updateDashboard();
    </script>
</body>
</html>
"""
