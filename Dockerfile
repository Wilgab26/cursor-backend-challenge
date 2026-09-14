# Use an official Node.js runtime as a parent image
FROM node:20.11.1-alpine
# Set the working directory in the container
WORKDIR /app
# Copy package.json and package-lock.json first to leverage Docker cache
COPY package.json package-lock.json ./
#Install dependencies using npm ci for a clean install
RUN npm ci
# Copy the rest of the application code
COPY . .
# Build the application
RUN npm run build
# Set the environment variable for production
EXPOSE 3000
# Start the application
# CMD ["npm", "start"]
