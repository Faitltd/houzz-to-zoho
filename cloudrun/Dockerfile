FROM node:18-slim

# Create app directory
WORKDIR /app

# Install app dependencies
COPY package*.json ./
RUN npm install

# Copy service account file
COPY service-account.json /app/service-account.json
RUN chmod 400 /app/service-account.json

# Bundle app source
COPY . .

# Expose port
EXPOSE 8080

# Start the application
CMD [ "node", "index.js" ]
