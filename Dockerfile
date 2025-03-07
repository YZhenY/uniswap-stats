FROM node:18-alpine

# Create app directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application code
COPY . .

# Expose ports for both React app and API server
EXPOSE 3000
EXPOSE 3001

# Start both servers in development mode
CMD ["npm", "run", "dev"]
