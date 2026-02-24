# 🔲 QR Forge

A full-stack QR code generator built with **Flask**, **MySQL**, and **Vanilla JS/CSS**. Generate crisp, customizable QR codes instantly — with a searchable history, CSV export, and one-click PNG download.

![Python](https://img.shields.io/badge/Python-3.8+-blue?style=flat-square&logo=python)
![Flask](https://img.shields.io/badge/Flask-2.x-black?style=flat-square&logo=flask)
![MySQL](https://img.shields.io/badge/MySQL-8.0+-orange?style=flat-square&logo=mysql)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

---

## ✨ Features

- 🎨 **Custom styling** — choose QR color, background, size, border, and error correction level (L/M/Q/H)
- 💾 **MySQL persistence** — every generation is auto-saved with full metadata
- 📋 **Generation history** — searchable, sortable list of past QR codes with preview
- 📥 **Download & Copy** — export as high-res PNG or copy the encoded URL instantly
- 📊 **Stats dashboard** — total generated, today's count, and most recent entry
- 🗑️ **Bulk delete & CSV export** — manage your history with ease
- 📡 **Live status indicators** — real-time API and DB connection status in the navbar
- ✨ **Animated background** — Three.js canvas animation

---

## 🛠 Tech Stack

| Layer    | Technology                  |
|----------|-----------------------------|
| Backend  | Python, Flask, Flask-CORS   |
| Database | MySQL                       |
| QR Engine| qrcode[pil], Pillow         |
| Frontend | Vanilla HTML, CSS, JS       |
| Graphics | Three.js (r128)             |

---

## 📋 Prerequisites

- Python 3.8+
- MySQL 8.0+
- pip

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/your-username/qr-forge.git
cd qr-forge
```

### 2. Install Python dependencies

```bash
pip install -r requirements.txt
```

### 3. Set up the MySQL database

Log into MySQL and run the following:

```sql
CREATE DATABASE qr_forge;

USE qr_forge;

CREATE TABLE qr_codes (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    text_input      TEXT NOT NULL,
    fill_color      VARCHAR(50)  DEFAULT 'black',
    back_color      VARCHAR(50)  DEFAULT 'white',
    box_size        INT          DEFAULT 10,
    border_size     INT          DEFAULT 4,
    error_correction VARCHAR(1)  DEFAULT 'H',
    image_data      LONGTEXT,
    created_at      DATETIME     DEFAULT CURRENT_TIMESTAMP
);
```

### 4. Configure database credentials

Open `app.py` and update the `DB_CONFIG` block with your MySQL credentials:

```python
DB_CONFIG = {
    'host':     'localhost',
    'user':     'your_mysql_user',
    'password': 'your_mysql_password',
    'database': 'qr_forge'
}
```

### 5. Run the Flask server

```bash
python app.py
```

The API will be available at `http://localhost:5000`.

### 6. Open the frontend

Open `index.html` in your browser directly, or serve it with any static file server:

```bash
# Using Python's built-in server
python -m http.server 8080
```

Then visit `http://localhost:8080`.

---

## 📡 API Reference

| Method | Endpoint              | Description                        |
|--------|-----------------------|------------------------------------|
| GET    | `/`                   | Health check                       |
| POST   | `/generate`           | Generate a QR code (returns base64)|
| POST   | `/download`           | Generate and download as PNG       |
| GET    | `/history`            | Fetch last 50 QR codes             |
| GET    | `/history/<id>`       | Fetch a single record with image   |
| DELETE | `/history/<id>`       | Delete a single record             |
| DELETE | `/history/all`        | Delete all records                 |
| GET    | `/stats`              | Total count, today's count, latest |

### Example — Generate a QR code

**Request:**
```json
POST /generate
{
  "text": "https://example.com",
  "fill_color": "#111111",
  "back_color": "#ffffff",
  "box_size": 10,
  "border": 4,
  "error_correction": "H"
}
```

**Response:**
```json
{
  "success": true,
  "image": "data:image/png;base64,...",
  "text": "https://example.com",
  "id": 42
}
```

---

## 📁 Project Structure

```
qr-forge/
├── app.py           # Flask backend & API routes
├── requirements.txt # Python dependencies
├── index.html       # Frontend UI
├── style.css        # Styles
└── script.js        # Frontend logic
```

---

## ⚙️ Error Correction Levels

| Level | Recovery Capacity | Best For               |
|-------|-------------------|------------------------|
| L     | ~7%               | Clean environments     |
| M     | ~15%              | General use            |
| Q     | ~25%              | Slightly dirty surfaces|
| H     | ~30%              | Print, stickers, logos |

---

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you'd like to change.

---
