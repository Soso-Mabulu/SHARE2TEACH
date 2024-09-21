# Use the official Node.js image as a base image
FROM node:18-buster AS builder

# Set the working directory in the container
WORKDIR /app

# Copy the package.json and package-lock.json files
COPY package*.json ./

# Install all dependencies (both production and development)
RUN apt-get update && \
    apt-get install -y build-essential python3 && \
    npm install && \
    npm rebuild bcrypt --build-from-source && \
    apt-get purge -y build-essential python3 && \
    apt-get autoremove -y && \
    rm -rf /var/lib/apt/lists/*

# Copy the rest of the application code
COPY . .

# Remove node_modules and reinstall dependencies
RUN rm -rf node_modules && npm install

# Expose the port that the app runs on
EXPOSE 3000

# Start the application
CMD ["node", "server.js"]
