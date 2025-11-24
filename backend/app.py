from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit
import json
import os

app = Flask(__name__)
CORS(app)

# SocketIO setup
socketio = SocketIO(app, cors_allowed_origins="*")

POSITIONS_FILE = 'positions.json'


def load_positions():
    if os.path.exists(POSITIONS_FILE):
        with open(POSITIONS_FILE, 'r') as f:
            return json.load(f)
    return {}


def save_positions(positions):
    with open(POSITIONS_FILE, 'w') as f:
        json.dump(positions, f)


@app.route('/load', methods=['GET'])
def load():
    positions = load_positions()
    return jsonify(positions)


@app.route('/save', methods=['POST'])
def save():
    data = request.json
    if not data or 'positions' not in data:
        return jsonify({'error': 'Invalid data'}), 400

    # Write to file
    save_positions(data['positions'])

    # Broadcast live update to ALL connected clients
    socketio.emit('update_positions', data['positions'], broadcast=True)

    return jsonify({'status': 'success'})


@app.route('/reset', methods=['POST'])
def reset():
    if os.path.exists(POSITIONS_FILE):
        os.remove(POSITIONS_FILE)

    # Broadcast reset event
    socketio.emit('update_positions', {}, broadcast=True)

    return jsonify({'status': 'reset success'})


if __name__ == '__main__':
    # socketio.run replaces app.run so WebSockets work
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)
