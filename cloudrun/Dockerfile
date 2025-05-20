FROM --platform=linux/amd64 node:18-slim

# Create app directory
WORKDIR /app

# Install app dependencies
COPY package*.json ./
RUN npm install

# Bundle app source
COPY . .

# Expose port
EXPOSE 8080

# Start the application
CMD [ "node", "index.js" ]
