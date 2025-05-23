FROM node:18-slim

# Install Python and required packages
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-dev \
    python3-venv \
    build-essential \
    # Dependencies for pdf2image
    poppler-utils \
    # Dependencies for OCR
    tesseract-ocr \
    libtesseract-dev \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Install app dependencies
COPY package*.json ./
RUN npm install

# Copy service account file
COPY service-account.json /app/service-account.json
RUN chmod 400 /app/service-account.json

# Create a virtual environment for Python packages
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy Python requirements file
COPY requirements.txt ./
RUN pip3 install --no-cache-dir -r requirements.txt

# Copy Python scripts
COPY parse_pdf_for_node.py /app/parse_pdf_for_node.py
COPY ocr_pdf_parser.py /app/ocr_pdf_parser.py
RUN chmod +x /app/parse_pdf_for_node.py /app/ocr_pdf_parser.py

# Bundle app source
COPY . .

# Expose port
EXPOSE 8080

# Start the application
CMD [ "node", "index.js" ]
