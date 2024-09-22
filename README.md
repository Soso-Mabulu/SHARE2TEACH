# Share-2-Teach Backend

This is the backend of the Share-2-Teach application, which is built using Express.js and utilizes AWS services. The application allows users to upload and share documents for their subjects and view documents posted by others.

## Table of Contents

- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [API Endpoints](#api-endpoints)
- [Contributing](#contributing)
- [License](#license)

## Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/Soso-Mabulu/SHARE2TEACH.git
   cd share-2-teach-backend
2. ** Install Dependencies:**

    Make sure you have Node.js installed, then run:
    
    ```bash
    npm install

## Configuration

### Create a `.env` file:

The `.env` file is where you store your environment variables. Create a file in the root of your project called `.env` and add the following variables:

   ```plaintext
    PORT=3000
    AWS_ACCESS_KEY_ID=your_aws_access_key
    AWS_SECRET_ACCESS_KEY=your_aws_secret_key
    AWS_REGION=your_aws_region
    S3_BUCKET_NAME=your_s3_bucket_name
    DATABASE_URL=your_database_url
    JWT_SECRET=your_jwt_secret
   ```
Replace the placeholders with your actual credentials and configurations.

### AWS S3 Configuration:

Ensure you have an S3 bucket set up on AWS and update the `AWS_REGION` and `S3_BUCKET_NAME` in your `.env` file accordingly.

## Running the Application

### Start the development server:

To start the server, run:

 ```bash
 npm start
```
The server will run on the port specified in the `.env` file (default is 3000).

## Access the API:

Once the server is running, you can access the API at [http://localhost:3000](http://localhost:3000).

## API Endpoints

Here are some of the key API endpoints available:

- **POST /register:** Register a new user.
- **POST /login:** Authenticate a user and return a JWT token.
- **POST /upload:** Upload a document (requires authentication).
- **GET /documents:** Get a list of all available documents.
- **GET /documents/:id:** Get details of a specific document.
- **POST /documents/:id/rate:** Rate a document (requires authentication).

_Note: Ensure you pass the JWT token in the `Authorization` header for endpoints that require authentication._

## Contributing

If you'd like to contribute to this project, please fork the repository and use a feature branch. Pull requests are welcome.

1. Fork the repo and create your branch from `main`.
2. If you've added code that should be tested, add tests.
3. Ensure the test suite passes.
4. Make sure your code lints.
5. Issue that pull request!

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

