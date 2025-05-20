#!/usr/bin/env python3
"""
Houzz to Zoho Dashboard

A simple web dashboard to monitor the sync status.
"""

import os
import sys
import json
import datetime
import re
from flask import Flask, render_template, request, redirect, url_for, flash, jsonify
from config import LOG_FILE, TOKEN_FILE

app = Flask(__name__)
app.secret_key = 'houzz_to_zoho_dashboard_secret_key'

# Dashboard data file
DASHBOARD_DATA_FILE = 'dashboard_data.json'

def get_dashboard_data():
    """Get the dashboard data from the data file."""
    if os.path.exists(DASHBOARD_DATA_FILE):
        try:
            with open(DASHBOARD_DATA_FILE, 'r') as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading dashboard data: {str(e)}")
    
    # Return default data if file doesn't exist or there's an error
    return {
        'last_sync': None,
        'last_sync_status': 'Unknown',
        'total_syncs': 0,
        'successful_syncs': 0,
        'failed_syncs': 0,
        'total_estimates': 0,
        'total_files_processed': 0,
        'recent_syncs': [],
        'recent_estimates': []
    }

def save_dashboard_data(data):
    """Save the dashboard data to the data file."""
    try:
        with open(DASHBOARD_DATA_FILE, 'w') as f:
            json.dump(data, f)
    except Exception as e:
        print(f"Error saving dashboard data: {str(e)}")

def update_dashboard_data(sync_status, estimates=None, files_processed=None):
    """Update the dashboard data with the latest sync information."""
    data = get_dashboard_data()
    
    # Update sync information
    now = datetime.datetime.now().isoformat()
    data['last_sync'] = now
    data['last_sync_status'] = sync_status
    data['total_syncs'] += 1
    
    if sync_status == 'Success':
        data['successful_syncs'] += 1
    else:
        data['failed_syncs'] += 1
    
    # Add to recent syncs
    data['recent_syncs'].insert(0, {
        'timestamp': now,
        'status': sync_status,
        'estimates': len(estimates) if estimates else 0,
        'files_processed': len(files_processed) if files_processed else 0
    })
    
    # Keep only the 10 most recent syncs
    data['recent_syncs'] = data['recent_syncs'][:10]
    
    # Update estimate information
    if estimates:
        data['total_estimates'] += len(estimates)
        
        # Add to recent estimates
        for estimate_id, estimate_number in estimates:
            data['recent_estimates'].insert(0, {
                'timestamp': now,
                'estimate_id': estimate_id,
                'estimate_number': estimate_number
            })
        
        # Keep only the 10 most recent estimates
        data['recent_estimates'] = data['recent_estimates'][:10]
    
    # Update files processed information
    if files_processed:
        data['total_files_processed'] += len(files_processed)
    
    # Save the updated data
    save_dashboard_data(data)

def parse_log_file():
    """Parse the log file to extract sync information."""
    if not os.path.exists(LOG_FILE):
        return []
    
    log_entries = []
    current_entry = None
    
    with open(LOG_FILE, 'r') as f:
        for line in f:
            # Check if this is a new log entry
            timestamp_match = re.match(r'(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},\d{3}) - (\w+) - (\w+) - (.*)', line)
            if timestamp_match:
                if current_entry:
                    log_entries.append(current_entry)
                
                timestamp, logger_name, level, message = timestamp_match.groups()
                current_entry = {
                    'timestamp': timestamp,
                    'logger': logger_name,
                    'level': level,
                    'message': message,
                    'details': []
                }
            elif current_entry:
                # Add this line to the details of the current entry
                current_entry['details'].append(line.strip())
    
    # Add the last entry
    if current_entry:
        log_entries.append(current_entry)
    
    return log_entries

def check_token_status():
    """Check the status of the Zoho token."""
    if not os.path.exists(TOKEN_FILE):
        return {
            'status': 'Missing',
            'message': 'Token file not found. Please run the authorization process.'
        }
    
    try:
        with open(TOKEN_FILE, 'r') as f:
            token_data = json.load(f)
        
        if 'expires_at' in token_data:
            expires_at = token_data['expires_at']
            now = datetime.datetime.now().timestamp()
            
            if now >= expires_at:
                return {
                    'status': 'Expired',
                    'message': f'Token expired at {datetime.datetime.fromtimestamp(expires_at).isoformat()}.'
                }
            else:
                expires_in = expires_at - now
                return {
                    'status': 'Valid',
                    'message': f'Token valid for {int(expires_in / 60)} minutes and {int(expires_in % 60)} seconds.'
                }
        else:
            return {
                'status': 'Unknown',
                'message': 'Token file exists but expiration time is unknown.'
            }
    except Exception as e:
        return {
            'status': 'Error',
            'message': f'Error checking token status: {str(e)}'
        }

@app.route('/')
def index():
    """Render the dashboard."""
    data = get_dashboard_data()
    log_entries = parse_log_file()
    token_status = check_token_status()
    
    return render_template('index.html', data=data, log_entries=log_entries, token_status=token_status)

@app.route('/api/data')
def api_data():
    """Return the dashboard data as JSON."""
    data = get_dashboard_data()
    return jsonify(data)

@app.route('/api/logs')
def api_logs():
    """Return the log entries as JSON."""
    log_entries = parse_log_file()
    return jsonify(log_entries)

@app.route('/api/token')
def api_token():
    """Return the token status as JSON."""
    token_status = check_token_status()
    return jsonify(token_status)

if __name__ == '__main__':
    # Create templates directory if it doesn't exist
    os.makedirs('templates', exist_ok=True)
    
    # Create the index.html template if it doesn't exist
    if not os.path.exists('templates/index.html'):
        with open('templates/index.html', 'w') as f:
            f.write('''
<!DOCTYPE html>
<html>
<head>
    <title>Houzz to Zoho Dashboard</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        body { padding-top: 20px; }
        .card { margin-bottom: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <h1 class="mb-4">Houzz to Zoho Dashboard</h1>
        
        <div class="row">
            <div class="col-md-6">
                <div class="card">
                    <div class="card-header">
                        <h5>Sync Status</h5>
                    </div>
                    <div class="card-body">
                        <p><strong>Last Sync:</strong> {{ data.last_sync|default('Never') }}</p>
                        <p><strong>Status:</strong> 
                            {% if data.last_sync_status == 'Success' %}
                                <span class="badge bg-success">Success</span>
                            {% elif data.last_sync_status == 'Failed' %}
                                <span class="badge bg-danger">Failed</span>
                            {% else %}
                                <span class="badge bg-secondary">Unknown</span>
                            {% endif %}
                        </p>
                        <p><strong>Total Syncs:</strong> {{ data.total_syncs }}</p>
                        <p><strong>Successful Syncs:</strong> {{ data.successful_syncs }}</p>
                        <p><strong>Failed Syncs:</strong> {{ data.failed_syncs }}</p>
                    </div>
                </div>
            </div>
            
            <div class="col-md-6">
                <div class="card">
                    <div class="card-header">
                        <h5>Token Status</h5>
                    </div>
                    <div class="card-body">
                        <p><strong>Status:</strong> 
                            {% if token_status.status == 'Valid' %}
                                <span class="badge bg-success">Valid</span>
                            {% elif token_status.status == 'Expired' %}
                                <span class="badge bg-danger">Expired</span>
                            {% elif token_status.status == 'Missing' %}
                                <span class="badge bg-warning">Missing</span>
                            {% else %}
                                <span class="badge bg-secondary">{{ token_status.status }}</span>
                            {% endif %}
                        </p>
                        <p>{{ token_status.message }}</p>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="row">
            <div class="col-md-6">
                <div class="card">
                    <div class="card-header">
                        <h5>Recent Syncs</h5>
                    </div>
                    <div class="card-body">
                        <table class="table table-striped">
                            <thead>
                                <tr>
                                    <th>Timestamp</th>
                                    <th>Status</th>
                                    <th>Estimates</th>
                                    <th>Files</th>
                                </tr>
                            </thead>
                            <tbody>
                                {% for sync in data.recent_syncs %}
                                <tr>
                                    <td>{{ sync.timestamp }}</td>
                                    <td>
                                        {% if sync.status == 'Success' %}
                                            <span class="badge bg-success">Success</span>
                                        {% elif sync.status == 'Failed' %}
                                            <span class="badge bg-danger">Failed</span>
                                        {% else %}
                                            <span class="badge bg-secondary">{{ sync.status }}</span>
                                        {% endif %}
                                    </td>
                                    <td>{{ sync.estimates }}</td>
                                    <td>{{ sync.files_processed }}</td>
                                </tr>
                                {% endfor %}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            
            <div class="col-md-6">
                <div class="card">
                    <div class="card-header">
                        <h5>Recent Estimates</h5>
                    </div>
                    <div class="card-body">
                        <table class="table table-striped">
                            <thead>
                                <tr>
                                    <th>Timestamp</th>
                                    <th>Estimate Number</th>
                                </tr>
                            </thead>
                            <tbody>
                                {% for estimate in data.recent_estimates %}
                                <tr>
                                    <td>{{ estimate.timestamp }}</td>
                                    <td>{{ estimate.estimate_number }}</td>
                                </tr>
                                {% endfor %}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="row">
            <div class="col-12">
                <div class="card">
                    <div class="card-header">
                        <h5>Recent Logs</h5>
                    </div>
                    <div class="card-body">
                        <div class="accordion" id="logsAccordion">
                            {% for entry in log_entries[:20] %}
                            <div class="accordion-item">
                                <h2 class="accordion-header" id="heading{{ loop.index }}">
                                    <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapse{{ loop.index }}" aria-expanded="false" aria-controls="collapse{{ loop.index }}">
                                        <span class="me-2">{{ entry.timestamp }}</span>
                                        {% if entry.level == 'ERROR' %}
                                            <span class="badge bg-danger me-2">{{ entry.level }}</span>
                                        {% elif entry.level == 'WARNING' %}
                                            <span class="badge bg-warning me-2">{{ entry.level }}</span>
                                        {% elif entry.level == 'INFO' %}
                                            <span class="badge bg-info me-2">{{ entry.level }}</span>
                                        {% else %}
                                            <span class="badge bg-secondary me-2">{{ entry.level }}</span>
                                        {% endif %}
                                        {{ entry.message }}
                                    </button>
                                </h2>
                                <div id="collapse{{ loop.index }}" class="accordion-collapse collapse" aria-labelledby="heading{{ loop.index }}" data-bs-parent="#logsAccordion">
                                    <div class="accordion-body">
                                        <pre>{{ entry.message }}
{% for detail in entry.details %}{{ detail }}
{% endfor %}</pre>
                                    </div>
                                </div>
                            </div>
                            {% endfor %}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        // Auto-refresh the page every 60 seconds
        setTimeout(function() {
            location.reload();
        }, 60000);
    </script>
</body>
</html>
            ''')
    
    # Run the app
    app.run(host='0.0.0.0', port=5000, debug=True)
