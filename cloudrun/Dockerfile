FROM node:18-slim

# Install Python and required packages
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-dev \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Install app dependencies
COPY package*.json ./
RUN npm install

# Copy service account file
COPY service-account.json /app/service-account.json
RUN chmod 400 /app/service-account.json

# Install Python packages directly using apt
RUN apt-get update && apt-get install -y \
    python3-pdfplumber \
    python3-pandas \
    && rm -rf /var/lib/apt/lists/*

# If packages are not available in apt, create a virtual environment
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy Python requirements file for any additional packages
COPY requirements.txt ./
RUN pip3 install --no-cache-dir -r requirements.txt

# Copy Python script
COPY parse_pdf_for_node.py /app/parse_pdf_for_node.py
RUN chmod +x /app/parse_pdf_for_node.py

# Bundle app source
COPY . .

# Expose port
EXPOSE 8080

# Start the application
CMD [ "node", "index.js" ]
