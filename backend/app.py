from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit
import json
import os
import eventlet

eventlet.monkey_patch()  # Required for SocketIO with eventlet

app = Flask(__name__)
CORS(app)

# SocketIO setup with eventlet
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')

POSITIONS_FILE = 'positions.json'

def load_positions():
    """Load positions from JSON file, return empty dict if file doesn't exist."""
    if os.path.exists(POSITIONS_FILE):
        try:
            with open(POSITIONS_FILE, 'r') as f:
                return json.load(f)
        except json.JSONDecodeError:
            return {}
    return {}

def save_positions(positions):
    """Save positions to JSON file."""
    with open(POSITIONS_FILE, 'w') as f:
        json.dump(positions, f)

@app.route('/load', methods=['GET'])
def load():
    """Return current positions."""
    positions = load_positions()
    return jsonify(positions)

@app.route('/save', methods=['POST'])
def save():
    """Save positions and broadcast to all clients."""
    data = request.json
    if not data or 'positions' not in data:
        return jsonify({'error': 'Invalid data'}), 400

    save_positions(data['positions'])
    socketio.emit('update_positions', data['positions'], broadcast=True)
    return jsonify({'status': 'success'})

@app.route('/reset', methods=['POST'])
def reset():
    """Reset positions and broadcast to all clients."""
    if os.path.exists(POSITIONS_FILE):
        os.remove(POSITIONS_FILE)

    socketio.emit('update_positions', {}, broadcast=True)
    return jsonify({'status': 'reset success'})

if __name__ == '__main__':
    # Use Railway-assigned port or default to 5000 locally
    port = int(os.environ.get('PORT', 5000))
    # Run SocketIO server with eventlet
    socketio.run(app, host='0.0.0.0', port=port)
