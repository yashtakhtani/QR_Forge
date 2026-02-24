from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import qrcode
import io
import base64
import mysql.connector
from mysql.connector import Error
from datetime import datetime, date

app = Flask(__name__)
CORS(app)

DB_CONFIG = {
    'host':     'localhost',
    'user':     'root',
    'password': 'Takhtani7710862952$',
    'database': 'qr_forge'
}

EC_MAP = {
    'L': qrcode.constants.ERROR_CORRECT_L,
    'M': qrcode.constants.ERROR_CORRECT_M,
    'Q': qrcode.constants.ERROR_CORRECT_Q,
    'H': qrcode.constants.ERROR_CORRECT_H,
}

def get_db():
    try:
        return mysql.connector.connect(**DB_CONFIG)
    except Error as e:
        print(f"[DB ERROR] {e}")
        return None

def save_to_db(text, fill_color, back_color, box_size, border, ec, image_base64):
    conn = get_db()
    if not conn: return None
    try:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO qr_codes (text_input, fill_color, back_color, box_size, border_size, error_correction, image_data)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (text, fill_color, back_color, box_size, border, ec, image_base64))
        conn.commit()
        return cur.lastrowid
    except Error as e:
        print(f"[DB INSERT ERROR] {e}")
        return None
    finally:
        cur.close(); conn.close()

def make_qr(text, fill_color, back_color, box_size, border, ec='H'):
    qr = qrcode.QRCode(
        version=1,
        error_correction=EC_MAP.get(ec, qrcode.constants.ERROR_CORRECT_H),
        box_size=box_size,
        border=border,
    )
    qr.add_data(text)
    qr.make(fit=True)
    img = qr.make_image(fill_color=fill_color, back_color=back_color)
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    buf.seek(0)
    raw = buf.getvalue()
    return raw, base64.b64encode(raw).decode('utf-8')


@app.route('/')
def home():
    return jsonify({"message": "QR Forge API is running!"})

@app.route('/generate', methods=['POST'])
def generate_qr():
    data = request.get_json()
    if not data or not data.get('text', '').strip():
        return jsonify({"error": "No text provided"}), 400

    text       = data['text'].strip()
    fill_color = data.get('fill_color', 'black')
    back_color = data.get('back_color', 'white')
    box_size   = int(data.get('box_size', 10))
    border     = int(data.get('border', 4))
    ec         = data.get('error_correction', 'H').upper()

    _, img_b64 = make_qr(text, fill_color, back_color, box_size, border, ec)
    record_id  = save_to_db(text, fill_color, back_color, box_size, border, ec, img_b64)

    return jsonify({"success": True, "image": f"data:image/png;base64,{img_b64}", "text": text, "id": record_id})

@app.route('/download', methods=['POST'])
def download_qr():
    data = request.get_json()
    if not data or not data.get('text', '').strip():
        return jsonify({"error": "No text provided"}), 400

    text       = data['text'].strip()
    fill_color = data.get('fill_color', 'black')
    back_color = data.get('back_color', 'white')
    box_size   = int(data.get('box_size', 10))
    border     = int(data.get('border', 4))
    ec         = data.get('error_correction', 'H').upper()

    raw, _ = make_qr(text, fill_color, back_color, box_size, border, ec)
    return send_file(io.BytesIO(raw), mimetype='image/png', as_attachment=True, download_name='QR_Code.png')

@app.route('/history', methods=['GET'])
def get_history():
    conn = get_db()
    if not conn: return jsonify({"error": "DB connection failed"}), 500
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute("""
            SELECT id, text_input, fill_color, back_color, box_size, border_size, created_at
            FROM qr_codes ORDER BY created_at DESC LIMIT 50
        """)
        rows = cur.fetchall()
        for r in rows: r['created_at'] = str(r['created_at'])
        return jsonify({"success": True, "history": rows})
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close(); conn.close()

@app.route('/history/<int:rid>', methods=['GET'])
def get_record(rid):
    conn = get_db()
    if not conn: return jsonify({"error": "DB connection failed"}), 500
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT * FROM qr_codes WHERE id = %s", (rid,))
        row = cur.fetchone()
        if not row: return jsonify({"error": "Not found"}), 404
        row['created_at'] = str(row['created_at'])
        row['image']      = f"data:image/png;base64,{row['image_data']}"
        del row['image_data']
        return jsonify({"success": True, "record": row})
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close(); conn.close()

@app.route('/history/<int:rid>', methods=['DELETE'])
def delete_record(rid):
    conn = get_db()
    if not conn: return jsonify({"error": "DB connection failed"}), 500
    try:
        cur = conn.cursor()
        cur.execute("DELETE FROM qr_codes WHERE id = %s", (rid,))
        conn.commit()
        return jsonify({"success": True, "deleted_id": rid})
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close(); conn.close()

@app.route('/history/all', methods=['DELETE'])
def delete_all():
    conn = get_db()
    if not conn: return jsonify({"error": "DB connection failed"}), 500
    try:
        cur = conn.cursor()
        cur.execute("DELETE FROM qr_codes")
        conn.commit()
        return jsonify({"success": True})
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close(); conn.close()

@app.route('/stats', methods=['GET'])
def get_stats():
    conn = get_db()
    if not conn: return jsonify({"error": "DB connection failed"}), 500
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute("SELECT COUNT(*) AS total FROM qr_codes")
        total = cur.fetchone()['total']
        cur.execute("SELECT COUNT(*) AS today FROM qr_codes WHERE DATE(created_at) = %s", (date.today(),))
        today = cur.fetchone()['today']
        cur.execute("SELECT text_input, created_at FROM qr_codes ORDER BY created_at DESC LIMIT 1")
        latest = cur.fetchone()
        if latest: latest['created_at'] = str(latest['created_at'])
        return jsonify({"success": True, "total_generated": total, "today_count": today, "latest": latest})
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close(); conn.close()

if __name__ == '__main__':
    app.run(debug=True, port=5000)